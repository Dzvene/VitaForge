"use client";

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ru from "./locales/ru.json";
import de from "./locales/de.json";

export const SUPPORTED_LANGS = ["en", "ru", "de"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  ru: "Русский",
  de: "Deutsch",
};

// Single init guard — App Router can import this module more than once.
if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        ru: { translation: ru },
        de: { translation: de },
      },
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      // Treat "de-DE" → "de" so browser tags resolve to a supported language.
      load: "languageOnly",
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "vf_lang",
      },
      react: { useSuspense: false },
    });
}

export default i18n;
