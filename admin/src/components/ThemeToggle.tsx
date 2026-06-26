"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/cn";

const ORDER: Theme[] = ["light", "dark", "system"];
const ICON = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const Icon = ICON[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${theme}`}
      title={theme}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface-2 text-ink-muted transition-colors hover:text-ink hover:border-line-strong",
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
