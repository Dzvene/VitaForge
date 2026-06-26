"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";

/**
 * Bounce an already-signed-in visitor away from guest-only pages
 * (login / register) straight to their dashboard.
 *
 * The returned flag is only ever true *after* mount, so the first client render
 * still matches the server (auth state lives in localStorage, which the server
 * can't see) — that keeps React from flagging a hydration mismatch. Callers use
 * the flag to render a spinner instead of the form during the redirect.
 */
export function useRedirectIfAuthed(to = "/dashboard"): boolean {
  const router = useRouter();
  const { accessToken, hydrated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && hydrated && accessToken) router.replace(to);
  }, [mounted, hydrated, accessToken, router, to]);

  return mounted && hydrated && !!accessToken;
}
