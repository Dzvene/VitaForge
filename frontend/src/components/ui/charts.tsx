"use client";

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { fmtKcal, fmtG, progress } from "@/lib/format";
import type { WeightPoint } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Calorie ring — the dashboard hero. Progress arc with a steel-blue gradient.
// ---------------------------------------------------------------------------
export function CalorieRing({
  eaten,
  target,
  size = 220,
  stroke = 16,
}: {
  eaten: number;
  target: number;
  size?: number;
  stroke?: number;
}) {
  const { t } = useTranslation();
  const gid = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = progress(eaten, target);
  const over = target > 0 && eaten > target;
  const remaining = Math.round(target - eaten);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="text-brand-400" stopColor="currentColor" />
            <stop offset="100%" className="text-accent" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-surface-3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={over ? "stroke-danger" : undefined}
          stroke={over ? undefined : `url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="label">{over ? t("charts.overBy") : t("charts.remaining")}</span>
        <span className={cn("nums text-4xl font-semibold", over ? "text-danger" : "text-ink")}>
          {fmtKcal(Math.abs(remaining))}
        </span>
        <span className="nums mt-0.5 text-xs text-ink-faint">
          {fmtKcal(eaten)} / {fmtKcal(target)} {t("common.kcal")}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Macro bar — one of protein / fat / carbs.
// ---------------------------------------------------------------------------
const MACRO_COLOR = {
  protein: "bg-macro-protein",
  fat: "bg-macro-fat",
  carb: "bg-macro-carb",
} as const;

export function MacroBar({
  kind,
  label,
  eaten,
  target,
}: {
  kind: "protein" | "fat" | "carb";
  label: string;
  eaten: number;
  target: number;
}) {
  const { t } = useTranslation();
  const g = t("common.grams");
  const frac = progress(eaten, target);
  const remaining = Math.max(0, target - eaten);
  const over = eaten > target;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="nums text-xs text-ink-muted">
          {fmtG(eaten, g)} <span className="text-ink-faint">/ {fmtG(target, g)}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", over ? "bg-danger" : MACRO_COLOR[kind])}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
      <div className="mt-1 text-right text-[11px] text-ink-faint">
        {over
          ? t("charts.overByAmount", { amount: fmtG(eaten - target, g) })
          : t("charts.leftAmount", { amount: fmtG(remaining, g) })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weight trend chart — raw points + smoothed trend line (spec §4.3).
// ---------------------------------------------------------------------------
export function TrendChart({ points, height = 200 }: { points: WeightPoint[]; height?: number }) {
  const { t } = useTranslation();
  if (points.length < 2) {
    return (
      <div className="grid h-[200px] place-items-center text-sm text-ink-faint">
        {t("weight.trendMinHint")}
      </div>
    );
  }
  const W = 600;
  const H = height;
  const pad = { top: 16, right: 12, bottom: 22, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const all = points.flatMap((p) => [p.weight_kg, p.trend_kg]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const padY = span * 0.15;
  const lo = min - padY;
  const hi = max + padY;

  const x = (i: number) => pad.left + (i / (points.length - 1)) * innerW;
  const y = (v: number) => pad.top + (1 - (v - lo) / (hi - lo)) * innerH;

  const trendPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.trend_kg).toFixed(1)}`)
    .join(" ");

  const gid = "trendfill";
  const areaPath =
    `${trendPath} L ${x(points.length - 1).toFixed(1)} ${(pad.top + innerH).toFixed(1)} ` +
    `L ${x(0).toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;

  const ticks = [hi, (hi + lo) / 2, lo];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weight trend">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="text-brand-500" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" className="text-brand-500" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeDasharray="3 4" />
          <text x={8} y={y(t) + 4} className="fill-ink-faint" fontSize="10">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      <path d={areaPath} fill={`url(#${gid})`} />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.weight_kg)} r={2.4} className="fill-ink-faint" />
      ))}
      <path d={trendPath} fill="none" className="stroke-brand-400" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
