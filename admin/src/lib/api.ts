// Minimal API client for the VitaForge admin. Token in localStorage; every
// request carries the bearer. 401 clears the session.

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api/v1";
const TOKEN_KEY = "vfadmin_token";

export const session = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = session.get();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    session.clear();
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      location.href = "/login";
    }
  }
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail =
      payload && typeof payload === "object" && typeof payload.detail === "string"
        ? payload.detail
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return payload as T;
}

// ----- types -----
export interface UserOut {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
}
export interface AdminStats {
  users: number;
  active_users: number;
  admins: number;
  foods: number;
  custom_foods: number;
  diary_entries: number;
  weight_logs: number;
}
export interface AdminUser extends UserOut {
  created_at: string;
}

// ----- endpoints -----
export const auth = {
  login: (email: string, password: string) =>
    api<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => api<UserOut>("/auth/me"),
};

export const admin = {
  stats: () => api<AdminStats>("/admin/stats"),
  users: () => api<AdminUser[]>("/admin/users"),
  patchUser: (id: number, body: { role?: string; is_active?: boolean }) =>
    api<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body }),
};
