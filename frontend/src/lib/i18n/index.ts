"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ru from "./locales/ru.json";
import de from "./locales/de.json";

export const SUPPORTED_LANGS = ["en", "ru", "de"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_STORAGE_KEY = "vf_lang";

export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  ru: "Русский",
  de: "Deutsch",
};

export function isSupportedLang(v: string | null | undefined): v is Lang {
  return !!v && (SUPPORTED_LANGS as readonly string[]).includes(v);
}

// Init with a FIXED language ("en") so the server render and the first client
// render agree — detection runs post-mount in I18nProvider to avoid the React
// hydration mismatch (#418) the browser language-detector used to cause.
// Single init guard — App Router can import this module more than once.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      de: { translation: de },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    // Treat "de-DE" → "de" so browser tags resolve to a supported language.
    load: "languageOnly",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
