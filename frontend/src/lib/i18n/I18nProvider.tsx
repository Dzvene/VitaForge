"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./index";

/**
 * Client i18n provider. The whole app is client-rendered, so a single
 * react-i18next provider covers every screen. Keeps <html lang> in sync with
 * the active language and avoids a hydration mismatch by rendering children
 * only after the language detector has resolved on the client.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(i18n.isInitialized);

  useEffect(() => {
    const sync = (lng: string) => {
      if (typeof document !== "undefined") document.documentElement.lang = lng;
    };
    if (i18n.isInitialized) {
      sync(i18n.language);
      setReady(true);
    } else {
      void i18n.init().then(() => {
        sync(i18n.language);
        setReady(true);
      });
    }
    i18n.on("languageChanged", sync);
    return () => i18n.off("languageChanged", sync);
  }, []);

  if (!ready) return null;
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
