import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  beforeEach(() => {
    useAuth.setState({ accessToken: null, refreshToken: null, user: null });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches the bearer token and parses JSON", async () => {
    useAuth.setState({ accessToken: "tok-1", refreshToken: "ref-1" });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const out = await api<{ id: number }>("/auth/me");
    expect(out).toEqual({ id: 1 });
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer tok-1");
  });

  it("throws ApiError with the backend detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Invalid email or password" }, 401)));
    // no refresh token → no retry, error surfaces
    await expect(api("/auth/login", { auth: false })).rejects.toBeInstanceOf(ApiError);
  });

  it("refreshes once on 401 then retries", async () => {
    useAuth.setState({ accessToken: "old", refreshToken: "ref-1" });
    const fetchMock = vi
      .fn()
      // first protected call → 401
      .mockResolvedValueOnce(jsonResponse({ detail: "Invalid token" }, 401))
      // refresh call → new tokens
      .mockResolvedValueOnce(jsonResponse({ access_token: "new", refresh_token: "ref-2", token_type: "bearer" }))
      // retried protected call → success
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const out = await api<{ ok: boolean }>("/profile");
    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuth.getState().accessToken).toBe("new");
  });
});
