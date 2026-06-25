"use client";

import { useTranslation } from "react-i18next";
import { formatDayAbsolute, relativeDayKey } from "@/lib/format";

const BCP47: Record<string, string> = {
  en: "en-US",
  ru: "ru-RU",
  de: "de-DE",
};

/**
 * Returns a function that turns a YYYY-MM-DD into a localized day label —
 * "Today"/"Yesterday"/"Tomorrow" when applicable, otherwise a locale-aware
 * absolute date (e.g. "Mon, 3 Jun" / "Пн, 3 июн." / "Mo., 3. Juni").
 */
export function useDayLabel(): (iso: string) => string {
  const { t, i18n } = useTranslation();
  const locale = BCP47[i18n.language] ?? "en-US";
  return (iso: string) => {
    const key = relativeDayKey(iso);
    return key ? t(`enums.day.${key}`) : formatDayAbsolute(iso, locale);
  };
}
