"use client";

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { fmtKcal, fmtG, progress } from "@/lib/format";
import type { WeightPoint } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Calorie ring — the dashboard hero.
// ---------------------------------------------------------------------------
export function CalorieRing({
  eaten,
  target,
  size = 220,
  stroke = 18,
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
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="text-brand-400" stopColor="currentColor" />
            <stop offset="100%" className="text-accent" stopColor="currentColor" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-surface-3" strokeWidth={stroke} />
        {/* Progress */}
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
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-0.5">
        <span className="label">{over ? t("charts.overBy") : t("charts.remaining")}</span>
        <span className={cn("nums font-bold leading-none", over ? "text-danger" : "text-ink")}
          style={{ fontSize: size * 0.17 }}>
          {fmtKcal(Math.abs(remaining))}
        </span>
        <span className="nums text-[11px] text-ink-faint leading-tight">
          {fmtKcal(eaten)} / {fmtKcal(target)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Macro colors — single source of truth used across charts + diary.
// ---------------------------------------------------------------------------
export const MACRO_BG: Record<"protein" | "fat" | "carb", string> = {
  protein: "bg-macro-protein",
  fat: "bg-macro-fat",
  carb: "bg-macro-carb",
};
export const MACRO_TEXT: Record<"protein" | "fat" | "carb", string> = {
  protein: "text-macro-protein",
  fat: "text-macro-fat",
  carb: "text-macro-carb",
};
export const MACRO_FILL: Record<"protein" | "fat" | "carb", string> = {
  protein: "fill-macro-protein",
  fat: "fill-macro-fat",
  carb: "fill-macro-carb",
};

// ---------------------------------------------------------------------------
// Macro bar — one of protein / fat / carbs. Includes colored dot + label.
// ---------------------------------------------------------------------------
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", MACRO_BG[kind])} />
          <span className="text-sm font-medium text-ink truncate">{label}</span>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className={cn("nums text-sm font-semibold", over ? "text-danger" : MACRO_TEXT[kind])}>
            {fmtG(eaten, g)}
          </span>
          <span className="nums text-xs text-ink-faint">/ {fmtG(target, g)}</span>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500",
            over ? "bg-danger" : MACRO_BG[kind])}
          style={{ width: `${Math.min(frac * 100, 100)}%` }}
        />
      </div>
      <p className={cn("text-right text-[11px]", over ? "text-danger" : "text-ink-faint")}>
        {over
          ? t("charts.overByAmount", { amount: fmtG(eaten - target, g) })
          : t("charts.leftAmount", { amount: fmtG(remaining, g) })}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Macro dot chip — used inline in diary entries / trends.
// ---------------------------------------------------------------------------
export function MacroDot({ kind, value }: { kind: "protein" | "fat" | "carb"; value: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", MACRO_BG[kind])} />
      <span className={cn("nums text-xs font-medium", MACRO_TEXT[kind])}>{Math.round(value)}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Weight trend chart.
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
          <stop offset="0%" className="text-brand-500" stopColor="currentColor" stopOpacity="0.2" />
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
        <circle key={i} cx={x(i)} cy={y(p.weight_kg)} r={3} className="fill-ink-faint/60" />
      ))}
      <path d={trendPath} fill="none" className="stroke-brand-400" strokeWidth={2.5}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
