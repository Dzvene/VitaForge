"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { LANG_STORAGE_KEY, isSupportedLang, type Lang } from "./index";

/**
 * Client i18n provider. The whole app is client-rendered, so a single
 * react-i18next provider covers every screen.
 *
 * The shared i18n instance is initialized with a fixed "en" language so the
 * server render and the first client render produce identical markup (no
 * hydration mismatch — see #418). The user's real language is detected *after*
 * mount and applied via changeLanguage, which re-renders the tree on the
 * client only. <html lang> and localStorage are kept in sync on every change.
 */
function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (isSupportedLang(saved)) return saved;
  const nav = window.navigator.language?.slice(0, 2).toLowerCase();
  if (isSupportedLang(nav)) return nav;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Force a re-render once the post-mount language is applied.
  const [, setReady] = useState(false);

  useEffect(() => {
    const sync = (lng: string) => {
      document.documentElement.lang = lng;
      try {
        window.localStorage.setItem(LANG_STORAGE_KEY, lng);
      } catch {
        /* private mode / storage disabled — language still applies for the session */
      }
    };
    const target = detectLang();
    if (i18n.language !== target) {
      void i18n.changeLanguage(target).then(() => {
        sync(target);
        setReady(true);
      });
    } else {
      sync(target);
      setReady(true);
    }
    i18n.on("languageChanged", sync);
    return () => i18n.off("languageChanged", sync);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
