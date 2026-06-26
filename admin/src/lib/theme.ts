"use client";

import { create } from "zustand";

export type Theme = "light" | "dark" | "system";
const KEY = "vf_theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyClass(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  init: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  // Matches the no-flash script default in app/layout.tsx (light unless saved).
  theme: "light",
  setTheme: (t) => {
    localStorage.setItem(KEY, t);
    applyClass(t);
    set({ theme: t });
  },
  init: () => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "light";
    applyClass(stored);
    set({ theme: stored });
    // Track OS changes while in "system" mode.
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (((localStorage.getItem(KEY) as Theme | null) ?? "light") === "system") {
          applyClass("system");
        }
      });
  },
}));
