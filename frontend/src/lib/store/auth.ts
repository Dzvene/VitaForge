import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TokenPair, UserOut } from "@/lib/api/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserOut | null;
  hydrated: boolean;
  setTokens: (t: TokenPair) => void;
  setUser: (u: UserOut | null) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      setTokens: (t) =>
        set({ accessToken: t.access_token, refreshToken: t.refresh_token }),
      setUser: (u) => set({ user: u }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: "vitaforge-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

// Non-React accessors for the fetch client (avoids hook usage outside React).
export const authStore = {
  get: () => useAuth.getState(),
  setTokens: (t: TokenPair) => useAuth.getState().setTokens(t),
  clear: () => useAuth.getState().clear(),
};
