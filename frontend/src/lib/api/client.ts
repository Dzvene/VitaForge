import { authStore } from "@/lib/store/auth";
import type { TokenPair } from "@/lib/api/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean; // attach bearer (default true)
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const u = new URL(path.startsWith("http") ? path : API_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

async function parse(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function detailOf(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const d = (payload as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length && typeof d[0] === "object") {
      // FastAPI validation error array
      const first = d[0] as { msg?: string };
      if (first.msg) return first.msg;
    }
  }
  return fallback;
}

// Single-flight refresh so concurrent 401s don't all hit /auth/refresh.
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const { refreshToken } = authStore.get();
  if (!refreshToken) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(API_BASE + "/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false;
        const pair = (await res.json()) as TokenPair;
        authStore.setTokens(pair);
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = opts;

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) {
      const token = authStore.get().accessToken;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await send();
  if (res.status === 401 && auth) {
    const ok = await tryRefresh();
    if (ok) {
      res = await send();
    } else {
      authStore.clear();
    }
  }

  const payload = await parse(res);
  if (!res.ok) {
    throw new ApiError(res.status, detailOf(payload, `Request failed (${res.status})`));
  }
  return payload as T;
}
