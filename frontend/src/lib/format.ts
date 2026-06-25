// Pure display + calc helpers. No IO — unit-tested in src/test.

/** Round to integer and group thousands with a thin space. */
export function fmtKcal(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Grams, rounded, with unit. The unit is i18n-supplied by callers (defaults
 *  to "g" so pure unit tests stay locale-free). */
export function fmtG(n: number, unit = "g"): string {
  return `${Math.round(n)} ${unit}`;
}

/** One-decimal kg with unit (caller passes the localized unit). */
export function fmtKg(n: number, unit = "kg"): string {
  return `${n.toFixed(1)} ${unit}`;
}

/** Signed one-decimal kg (e.g. "+0.3 kg", "−1.2 kg"). */
export function fmtKgSigned(n: number, unit = "kg"): string {
  const s = n.toFixed(1);
  if (n > 0) return `+${s} ${unit}`;
  return `${s.replace("-", "−")} ${unit}`;
}

/** Progress fraction of consumed/target, clamped to [0, 1] (for arcs/bars). */
export function progress(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, consumed / target));
}

/** Raw (unclamped) ratio — used to detect overage (> 1). */
export function ratio(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return consumed / target;
}

/** Local date as YYYY-MM-DD (no timezone shift). */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add days to a YYYY-MM-DD string, return YYYY-MM-DD. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return isoDate(dt);
}

/**
 * Relative-day i18n key for a YYYY-MM-DD, or `null` when it's neither today,
 * yesterday nor tomorrow (the caller then formats the absolute date). Pure —
 * the translation happens in `useDayLabel` (see lib/i18n/useDayLabel).
 */
export function relativeDayKey(iso: string): "today" | "yesterday" | "tomorrow" | null {
  if (iso === isoDate()) return "today";
  if (iso === addDays(isoDate(), -1)) return "yesterday";
  if (iso === addDays(isoDate(), 1)) return "tomorrow";
  return null;
}

/** Locale-aware "Mon, 3 Jun" style label for a YYYY-MM-DD. */
export function formatDayAbsolute(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
