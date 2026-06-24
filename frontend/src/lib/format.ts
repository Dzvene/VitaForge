// Pure display + calc helpers. No IO — unit-tested in src/test.

/** Round to integer and group thousands with a thin space. */
export function fmtKcal(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Grams, rounded, with unit. */
export function fmtG(n: number): string {
  return `${Math.round(n)} g`;
}

/** One-decimal kg with unit. */
export function fmtKg(n: number): string {
  return `${n.toFixed(1)} kg`;
}

/** Signed one-decimal kg (e.g. "+0.3 kg", "−1.2 kg"). */
export function fmtKgSigned(n: number): string {
  const s = n.toFixed(1);
  if (n > 0) return `+${s} kg`;
  return `${s.replace("-", "−")} kg`;
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

/** Human label for a YYYY-MM-DD relative to today. */
export function dayLabel(iso: string): string {
  if (iso === isoDate()) return "Today";
  if (iso === addDays(isoDate(), -1)) return "Yesterday";
  if (iso === addDays(isoDate(), 1)) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Light (1–3×/wk)",
  moderate: "Moderate (3–5×/wk)",
  high: "High (6–7×/wk)",
  very_high: "Very high",
};

export const GOAL_LABELS: Record<string, string> = {
  lose: "Lose fat",
  maintain: "Maintain",
  gain: "Build",
};
