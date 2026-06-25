"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, FlaskConical, RefreshCw, SkipForward } from "lucide-react";
import { calibration } from "@/lib/api/endpoints";
import { qk, useCalibration } from "@/lib/api/hooks";
import { isoDate, fmtKcal, fmtKgSigned } from "@/lib/format";
import type { EstimateResult } from "@/lib/api/types";
import { Badge, Button, Card, CardTitle, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export default function CalibrationPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const status = useCalibration();
  const [result, setResult] = useState<EstimateResult | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.calibration });
    qc.invalidateQueries({ queryKey: qk.target });
    qc.invalidateQueries({ queryKey: qk.day(isoDate()) });
  };

  const onResult = (okMsg: string) => (r: EstimateResult) => {
    setResult(r);
    invalidate();
    toast(r.ok ? okMsg : r.reason || t("calibration.notEnoughData"), r.ok ? "ok" : "info");
  };
  const onErr = () => toast(t("calibration.somethingWrong"), "error");

  const estimate = useMutation({
    mutationFn: calibration.estimate,
    onSuccess: onResult(t("calibration.toastCalibrated")),
    onError: onErr,
  });
  const recalc = useMutation({
    mutationFn: calibration.recalc,
    onSuccess: onResult(t("calibration.toastRecalculated")),
    onError: onErr,
  });
  const skip = useMutation({
    mutationFn: calibration.skip,
    onSuccess: onResult(t("calibration.toastSkipped")),
    onError: onErr,
  });

  const s = status.data;
  const pct = s ? Math.min(100, Math.round((s.clean_days_collected / s.window_days) * 100)) : 0;
  const done = s?.phase === "completed";

  return (
    <div className="space-y-6">
      <header>
        <p className="label">{t("calibration.eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("calibration.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("calibration.intro")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle
            right={
              done ? (
                <Badge tone="ok">
                  <CheckCircle2 className="h-3 w-3" /> {t("calibration.calibrated")}
                </Badge>
              ) : (
                <Badge tone="brand">{t("calibration.inProgress")}</Badge>
              )
            }
          >
            {t("calibration.baselineWindow")}
          </CardTitle>

          {status.isLoading || !s ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="nums text-sm text-ink-muted">
                    {t("calibration.cleanDaysCount", { collected: s.clean_days_collected, total: s.window_days })}
                  </span>
                  <span className="nums text-sm text-ink-faint">{pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-ink-faint">
                  {t("calibration.cleanDayExplain")} {!done && s.days_remaining > 0
                    ? t("calibration.daysRemaining", { count: s.days_remaining })
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!done && (
                  <Button onClick={() => estimate.mutate()} loading={estimate.isPending}>
                    <FlaskConical className="h-4 w-4" /> {t("calibration.computeBtn")}
                  </Button>
                )}
                {done && (
                  <Button onClick={() => recalc.mutate()} loading={recalc.isPending}>
                    <RefreshCw className="h-4 w-4" /> {t("calibration.recalcBtn")}
                  </Button>
                )}
                {!done && (
                  <Button variant="ghost" onClick={() => skip.mutate()} loading={skip.isPending}>
                    <SkipForward className="h-4 w-4" /> {t("calibration.skipBtn")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t("calibration.latestEstimate")}</CardTitle>
          {result && result.ok ? (
            <dl className="space-y-3">
              {result.real_tdee != null && (
                <Row label={t("calibration.realMaintenance")} value={`${fmtKcal(result.real_tdee)} ${t("common.kcal")}`} />
              )}
              {result.target_calories != null && (
                <Row label={t("calibration.newTarget")} value={`${fmtKcal(result.target_calories)} ${t("common.kcal")}`} strong />
              )}
              {result.avg_daily_intake != null && (
                <Row label={t("calibration.avgIntake")} value={`${fmtKcal(result.avg_daily_intake)} ${t("common.kcal")}`} />
              )}
              {result.trend_change_kg != null && (
                <Row label={t("calibration.trendChange")} value={fmtKgSigned(result.trend_change_kg)} />
              )}
            </dl>
          ) : result && !result.ok ? (
            <p className="text-sm text-ink-muted">{result.reason}</p>
          ) : s?.last_real_tdee ? (
            <Row label={t("calibration.lastRealMaintenance")} value={`${fmtKcal(s.last_real_tdee)} ${t("common.kcal")}`} strong />
          ) : (
            <p className="text-sm text-ink-faint">{t("calibration.runCalcHint")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={strong ? "nums text-sm font-semibold text-brand-400" : "nums text-sm text-ink"}>{value}</dd>
    </div>
  );
}
