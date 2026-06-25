"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/cn";

const ORDER: Theme[] = ["light", "dark", "system"];
const ICON = { light: Sun, dark: Moon, system: Monitor } as const;

/** Compact icon button that cycles light → dark → system. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const Icon = ICON[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={t("theme.toggle", { theme: t(`theme.${theme}`) })}
      title={t(`theme.${theme}`)}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface-2 text-ink-muted transition-colors hover:text-ink hover:border-line-strong",
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

/** Three-segment theme picker for Settings. */
export function ThemeSegmented() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {ORDER.map((opt) => {
        const Icon = ICON[opt];
        const active = theme === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => setTheme(opt)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(`theme.${opt}`)}
          </button>
        );
      })}
    </div>
  );
}
