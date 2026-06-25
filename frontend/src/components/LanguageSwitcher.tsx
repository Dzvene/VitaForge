"use client";

import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/**
 * Compact language picker. `variant="inline"` renders a small bordered select
 * (landing header / app top bar); `variant="segmented"` renders full-width
 * buttons for the settings screen.
 */
export function LanguageSwitcher({
  variant = "inline",
  className,
}: {
  variant?: "inline" | "segmented";
  className?: string;
}) {
  const { i18n } = useTranslation();
  const current = (SUPPORTED_LANGS as readonly string[]).includes(i18n.language)
    ? (i18n.language as Lang)
    : "en";

  const change = (lng: Lang) => {
    void i18n.changeLanguage(lng);
  };

  if (variant === "segmented") {
    return (
      <div className={cn("flex gap-1.5", className)}>
        {SUPPORTED_LANGS.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => change(lng)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm font-medium uppercase transition-colors",
              current === lng
                ? "border-brand-500 bg-brand-500/15 text-brand-300"
                : "border-line bg-surface-2 text-ink-muted hover:text-ink",
            )}
          >
            {lng}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <Languages className="pointer-events-none absolute left-2.5 h-4 w-4 text-ink-muted" />
      <select
        aria-label="Language"
        value={current}
        onChange={(e) => change(e.target.value as Lang)}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-line bg-surface-2 pl-8 pr-7 text-sm font-medium uppercase text-ink hover:bg-surface-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      >
        {SUPPORTED_LANGS.map((lng) => (
          <option key={lng} value={lng}>
            {lng.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
