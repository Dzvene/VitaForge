"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flame, Plus, Scale, TrendingDown } from "lucide-react";
import { qk, useCalibration, useDay, useGuidance, useTarget, useWeightSeries } from "@/lib/api/hooks";
import { weight as weightApi } from "@/lib/api/endpoints";
import { isoDate, fmtKcal, fmtKgSigned, fmtKg } from "@/lib/format";
import { useDayLabel } from "@/lib/i18n/useDayLabel";
import { Badge, Button, Card, CardTitle, Input, Skeleton } from "@/components/ui/primitives";
import { CalorieRing, MacroBar } from "@/components/ui/charts";
import { GuidanceList, HintsRail, WarningList } from "@/components/coaching/coaching";
import { useToast } from "@/components/ui/toast";

export default function DashboardPage() {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  const qc = useQueryClient();
  const toast = useToast();
  const today = isoDate();
  const target = useTarget();
  const day = useDay(today);
  const guidance = useGuidance(today);
  const calib = useCalibration();
  const weight = useWeightSeries();

  const [quickKg, setQuickKg] = useState("");
  const loggedToday = (weight.data?.points ?? []).some((p) => p.logged_on === today);

  const logWeight = useMutation({
    mutationFn: () => weightApi.log({ logged_on: today, weight_kg: Number(quickKg) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.weight });
      qc.invalidateQueries({ queryKey: qk.calibration });
      toast(t("weight.toastLogged"), "ok");
      setQuickKg("");
    },
    onError: () => toast(t("weight.toastError"), "error"),
  });

  const summary = day.data;
  const trend = weight.data?.points ?? [];
  const latest = trend[trend.length - 1];
  const trendChange = trend.length >= 2 ? latest.trend_kg - trend[0].trend_kg : null;
  const loading = target.isLoading || day.isLoading;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="label">{t("dashboard.todayLabel")}</p>
          <h1 className="text-2xl font-bold tracking-tight">{dayLabel(today)}</h1>
        </div>
        <Link href="/diary">
          <Button size="lg">
            <Plus className="h-4 w-4" /> {t("dashboard.logFood")}
          </Button>
        </Link>
      </header>

      {/* Calibrating notice */}
      {calib.data?.phase === "calibrating" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/5 px-4 py-3">
          <Badge tone="brand">{t("dashboard.calibrating")}</Badge>
          <p className="text-sm text-ink-muted">
            {t("dashboard.calibratingNote", {
              collected: calib.data.clean_days_collected,
              window: calib.data.window_days,
            })}
          </p>
          <Link href="/calibration" className="ml-auto text-sm font-medium text-brand-400 hover:text-brand-500">
            {t("dashboard.view")} →
          </Link>
        </div>
      )}

      <WarningList />

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* ── Calories + macros card ── */}
        <Card className="lg:col-span-2">
          {loading ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Skeleton className="h-[260px] w-[260px] rounded-full" />
              </div>
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : summary && target.data ? (
            <>
              {/* Mobile: ring centered full-width */}
              <div className="flex justify-center pb-6 sm:hidden">
                <CalorieRing
                  eaten={summary.eaten.kcal}
                  target={target.data.target_calories}
                  size={260}
                  stroke={20}
                />
              </div>

              {/* Desktop: side-by-side */}
              <div className="hidden sm:flex items-center gap-10 py-2">
                <CalorieRing
                  eaten={summary.eaten.kcal}
                  target={target.data.target_calories}
                  size={200}
                />
                <div className="flex-1 min-w-0 space-y-5">
                  <MacroBar kind="protein" label={t("common.protein")} eaten={summary.eaten.protein_g} target={target.data.protein_g} />
                  <MacroBar kind="fat" label={t("common.fat")} eaten={summary.eaten.fat_g} target={target.data.fat_g} />
                  <MacroBar kind="carb" label={t("common.carbs")} eaten={summary.eaten.carb_g} target={target.data.carb_g} />
                </div>
              </div>

              {/* Mobile macro bars */}
              <div className="space-y-4 sm:hidden">
                <MacroBar kind="protein" label={t("common.protein")} eaten={summary.eaten.protein_g} target={target.data.protein_g} />
                <MacroBar kind="fat" label={t("common.fat")} eaten={summary.eaten.fat_g} target={target.data.fat_g} />
                <MacroBar kind="carb" label={t("common.carbs")} eaten={summary.eaten.carb_g} target={target.data.carb_g} />
              </div>
            </>
          ) : null}

          {/* Coaching guidance */}
          {guidance.data?.items?.length ? (
            <div className="mt-6 border-t border-line pt-5">
              <GuidanceList items={guidance.data.items} />
            </div>
          ) : null}
        </Card>

        {/* ── Side column ── */}
        <div className="space-y-5">

          {/* Maintenance */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label">{t("dashboard.maintenance")}</p>
                {target.data ? (
                  <>
                    <p className="nums mt-2 text-4xl font-bold tracking-tight">
                      {fmtKcal(target.data.maintenance_kcal)}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {t("dashboard.kcalPerDay")} ·{" "}
                      {target.data.maintenance_source === "calibrated"
                        ? t("dashboard.fromYourData")
                        : t("dashboard.formulaEstimate")}
                    </p>
                    {target.data.rate_clamped && (
                      <p className="mt-2 text-xs text-warn">{t("dashboard.rateClamped")}</p>
                    )}
                  </>
                ) : (
                  <Skeleton className="mt-2 h-10 w-32" />
                )}
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10">
                <Flame className="h-5 w-5 text-brand-400" />
              </div>
            </div>
          </Card>

          {/* Weight trend */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="label">{t("dashboard.weightTrend")}</p>
                {weight.isLoading ? (
                  <Skeleton className="mt-2 h-10 w-28" />
                ) : latest ? (
                  <>
                    <p className="nums mt-2 text-4xl font-bold tracking-tight">
                      {fmtKg(latest.trend_kg, t("common.kg"))}
                    </p>
                    {trendChange !== null && (
                      <p className="nums mt-1 text-xs text-ink-faint">
                        {fmtKgSigned(trendChange, t("common.kg"))} {t("dashboard.trendOverDays", {
                          change: "", days: trend.length
                        }).replace(/^\s*·?\s*/, "").trim()}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">{t("weight.emptyTitle")}</p>
                )}
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10">
                <TrendingDown className="h-5 w-5 text-brand-400" />
              </div>
            </div>

            {/* Quick log weight */}
            <div className="mt-4 border-t border-line pt-4">
              {loggedToday ? (
                <div className="flex items-center gap-2 text-xs text-ink-faint">
                  <Scale className="h-3.5 w-3.5 text-ok" />
                  {t("dashboard.weighedInToday")}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    logWeight.mutate();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    type="number"
                    step="0.1"
                    min={30}
                    required
                    value={quickKg}
                    onChange={(e) => setQuickKg(e.target.value)}
                    placeholder={t("weight.weightPlaceholder")}
                    aria-label={t("weight.weightLabel")}
                    className="flex-1"
                  />
                  <Button type="submit" loading={logWeight.isPending} disabled={!quickKg} size="sm">
                    {t("dashboard.weighInToday")}
                  </Button>
                </form>
              )}
              {trend.length > 0 && (
                <Link href="/weight" className="mt-3 inline-block text-xs font-medium text-brand-400 hover:text-brand-500">
                  {t("dashboard.openChart")} →
                </Link>
              )}
            </div>
          </Card>

          {/* Target calories summary */}
          {target.data && (
            <Card>
              <CardTitle>{t("dashboard.todayTarget")}</CardTitle>
              <div className="grid grid-cols-2 gap-3">
                <StatCell label={t("common.calories")} value={fmtKcal(target.data.target_calories)} />
                <StatCell label={t("common.protein")} value={`${Math.round(target.data.protein_g)}${t("common.grams")}`} color="text-macro-protein" />
                <StatCell label={t("common.fat")} value={`${Math.round(target.data.fat_g)}${t("common.grams")}`} color="text-macro-fat" />
                <StatCell label={t("common.carbs")} value={`${Math.round(target.data.carb_g)}${t("common.grams")}`} color="text-macro-carb" />
              </div>
            </Card>
          )}
        </div>
      </div>

      <HintsRail />
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="label">{label}</p>
      <p className={cn("nums mt-1 text-base font-semibold", color ?? "text-ink")}>{value}</p>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
