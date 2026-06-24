"use client";

import Link from "next/link";
import { Flame, Plus, TrendingDown } from "lucide-react";
import { useCalibration, useDay, useGuidance, useTarget, useWeightSeries } from "@/lib/api/hooks";
import { isoDate, fmtKcal, fmtKgSigned, fmtKg } from "@/lib/format";
import { Badge, Button, Card, CardTitle, Skeleton } from "@/components/ui/primitives";
import { CalorieRing, MacroBar } from "@/components/ui/charts";
import { GuidanceList, HintsRail, WarningList } from "@/components/coaching/coaching";

export default function DashboardPage() {
  const today = isoDate();
  const target = useTarget();
  const day = useDay(today);
  const guidance = useGuidance(today);
  const calib = useCalibration();
  const weight = useWeightSeries();

  const summary = day.data;
  const trend = weight.data?.points ?? [];
  const trendChange =
    trend.length >= 2 ? trend[trend.length - 1].trend_kg - trend[0].trend_kg : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="label">Today</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </h1>
        </div>
        <Link href="/diary">
          <Button>
            <Plus className="h-4 w-4" /> Log food
          </Button>
        </Link>
      </header>

      {calib.data?.phase === "calibrating" && (
        <div className="card-2 flex flex-wrap items-center gap-3 p-4">
          <Badge tone="brand">Calibrating</Badge>
          <p className="text-sm text-ink-muted">
            Your norm is preliminary. {calib.data.clean_days_collected}/{calib.data.window_days} clean days collected —
            eat at maintenance and weigh daily.
          </p>
          <Link href="/calibration" className="ml-auto text-sm font-medium text-brand-400 hover:text-brand-500">
            View →
          </Link>
        </div>
      )}

      <WarningList />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calories + macros */}
        <Card className="lg:col-span-2">
          {target.isLoading || day.isLoading ? (
            <div className="flex flex-col items-center gap-6 py-6 sm:flex-row sm:items-center">
              <Skeleton className="h-[220px] w-[220px] rounded-full" />
              <div className="flex-1 space-y-4 self-stretch">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ) : (
            summary &&
            target.data && (
              <div className="flex flex-col items-center gap-8 py-2 sm:flex-row sm:items-center sm:gap-10">
                <CalorieRing eaten={summary.eaten.kcal} target={target.data.target_calories} />
                <div className="w-full flex-1 space-y-5">
                  <MacroBar kind="protein" label="Protein" eaten={summary.eaten.protein_g} target={target.data.protein_g} />
                  <MacroBar kind="fat" label="Fat" eaten={summary.eaten.fat_g} target={target.data.fat_g} />
                  <MacroBar kind="carb" label="Carbs" eaten={summary.eaten.carb_g} target={target.data.carb_g} />
                </div>
              </div>
            )
          )}
          {guidance.data?.items?.length ? (
            <div className="mt-6 border-t border-line pt-5">
              <GuidanceList items={guidance.data.items} />
            </div>
          ) : null}
        </Card>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardTitle right={<Flame className="h-4 w-4 text-brand-400" />}>Maintenance</CardTitle>
            {target.data ? (
              <div>
                <p className="nums text-3xl font-semibold">{fmtKcal(target.data.maintenance_kcal)}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  kcal/day ·{" "}
                  {target.data.maintenance_source === "calibrated" ? "from your data" : "formula estimate"}
                </p>
                {target.data.rate_clamped && (
                  <p className="mt-2 text-xs text-warn">Rate clamped to a healthy maximum.</p>
                )}
              </div>
            ) : (
              <Skeleton className="h-10" />
            )}
          </Card>

          <Card>
            <CardTitle right={<TrendingDown className="h-4 w-4 text-brand-400" />}>Weight trend</CardTitle>
            {weight.isLoading ? (
              <Skeleton className="h-10" />
            ) : trend.length ? (
              <div>
                <p className="nums text-3xl font-semibold">{fmtKg(trend[trend.length - 1].trend_kg)}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {trendChange !== null ? `${fmtKgSigned(trendChange)} over ${trend.length} days` : "smoothed trend"}
                </p>
                <Link href="/weight" className="mt-3 inline-block text-sm font-medium text-brand-400 hover:text-brand-500">
                  Open chart →
                </Link>
              </div>
            ) : (
              <Link href="/weight" className="text-sm font-medium text-brand-400 hover:text-brand-500">
                Log your first weigh-in →
              </Link>
            )}
          </Card>
        </div>
      </div>

      <HintsRail />
    </div>
  );
}
