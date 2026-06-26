"use client";

import { useEffect } from "react";
import { useTheme } from "@/lib/theme";

/** Sync the theme store from localStorage on mount (the head script already
 *  applied the class before paint). */
export function ThemeInit() {
  const init = useTheme((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return null;
}
