"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flame, Plus, TrendingDown } from "lucide-react";
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
  const trendChange =
    trend.length >= 2 ? trend[trend.length - 1].trend_kg - trend[0].trend_kg : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="label">{t("dashboard.todayLabel")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {dayLabel(today)}
          </h1>
        </div>
        <Link href="/diary">
          <Button>
            <Plus className="h-4 w-4" /> {t("dashboard.logFood")}
          </Button>
        </Link>
      </header>

      {calib.data?.phase === "calibrating" && (
        <div className="card-2 flex flex-wrap items-center gap-3 p-4">
          <Badge tone="brand">{t("dashboard.calibrating")}</Badge>
          <p className="text-sm text-ink-muted">
            {t("dashboard.calibratingNote", {
              collected: calib.data.clean_days_collected,
              window: calib.data.window_days,
            })}
          </p>
          <Link href="/calibration" className="ml-auto text-sm font-medium text-brand-400 hover:text-brand-500">
            {t("dashboard.view")}
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
                  <MacroBar kind="protein" label={t("common.protein")} eaten={summary.eaten.protein_g} target={target.data.protein_g} />
                  <MacroBar kind="fat" label={t("common.fat")} eaten={summary.eaten.fat_g} target={target.data.fat_g} />
                  <MacroBar kind="carb" label={t("common.carbs")} eaten={summary.eaten.carb_g} target={target.data.carb_g} />
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
            <CardTitle right={<Flame className="h-4 w-4 text-brand-400" />}>{t("dashboard.maintenance")}</CardTitle>
            {target.data ? (
              <div>
                <p className="nums text-3xl font-semibold">{fmtKcal(target.data.maintenance_kcal)}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {t("dashboard.kcalPerDay")} ·{" "}
                  {target.data.maintenance_source === "calibrated"
                    ? t("dashboard.fromYourData")
                    : t("dashboard.formulaEstimate")}
                </p>
                {target.data.rate_clamped && (
                  <p className="mt-2 text-xs text-warn">{t("dashboard.rateClamped")}</p>
                )}
              </div>
            ) : (
              <Skeleton className="h-10" />
            )}
          </Card>

          <Card>
            <CardTitle right={<TrendingDown className="h-4 w-4 text-brand-400" />}>{t("dashboard.weightTrend")}</CardTitle>
            {weight.isLoading ? (
              <Skeleton className="h-10" />
            ) : (
              <>
                {trend.length ? (
                  <div>
                    <p className="nums text-3xl font-semibold">{fmtKg(trend[trend.length - 1].trend_kg, t("common.kg"))}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {trendChange !== null
                        ? t("dashboard.trendOverDays", { change: fmtKgSigned(trendChange, t("common.kg")), days: trend.length })
                        : t("dashboard.smoothedTrend")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">{t("weight.emptyTitle")}</p>
                )}

                {loggedToday ? (
                  <p className="mt-4 text-xs text-ink-faint">{t("dashboard.weighedInToday")}</p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      logWeight.mutate();
                    }}
                    className="mt-4 flex gap-2 border-t border-line pt-4"
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
                    <Button type="submit" loading={logWeight.isPending} disabled={!quickKg}>
                      {t("dashboard.weighInToday")}
                    </Button>
                  </form>
                )}

                {trend.length > 0 && (
                  <Link href="/weight" className="mt-3 inline-block text-sm font-medium text-brand-400 hover:text-brand-500">
                    {t("dashboard.openChart")}
                  </Link>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <HintsRail />
    </div>
  );
}
