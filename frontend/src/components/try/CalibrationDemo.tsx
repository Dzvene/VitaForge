"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { preview } from "@/lib/api/endpoints";
import { addDays, fmtKcal, fmtKgSigned, isoDate } from "@/lib/format";
import type { EstimateResult } from "@/lib/api/types";
import { Card, CardTitle, Field, Input } from "@/components/ui/primitives";

const DAYS = 14;
// Deterministic per-day jitter (SSR-safe), centred on zero so the average holds.
const INTAKE_JITTER = [40, -60, 20, 80, -30, 50, -70, 10, 60, -40, 30, -20, 70, -50];
const WEIGHT_NOISE = [0, 0.5, -0.4, 0.7, 0.2, -0.6, 0.4, 0.9, -0.3, 0.1, 0.6, -0.5, 0.3, -0.2];

function buildIntake(avg: number) {
  const today = isoDate();
  return INTAKE_JITTER.map((j, i) => ({
    day: addDays(today, -(DAYS - 1 - i)),
    kcal: Math.round(avg + j),
  }));
}

function buildWeights(start: number, changeKg: number) {
  const today = isoDate();
  const step = changeKg / (DAYS - 1);
  return WEIGHT_NOISE.map((n, i) => ({
    logged_on: addDays(today, -(DAYS - 1 - i)),
    weight_kg: Math.round((start + step * i + n) * 10) / 10,
  }));
}

export function CalibrationDemo() {
  const { t } = useTranslation();
  const [avgIntake, setAvgIntake] = useState("2400");
  const [changeKg, setChangeKg] = useState("-0.4");
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const weights = buildWeights(80, Number(changeKg));
      const intake = buildIntake(Number(avgIntake));
      preview
        .calibration(weights, intake)
        .then((r) => {
          setResult(r);
          setError(null);
        })
        .catch(() => setError(t("try.errorFallback")));
    }, 250);
    return () => clearTimeout(id);
  }, [avgIntake, changeKg, t]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <CardTitle>{t("tryCalib.inputsTitle")}</CardTitle>
        <p className="mb-4 text-sm text-ink-muted">{t("tryCalib.inputsHint")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("tryCalib.avgIntakeLabel")} hint={t("tryCalib.avgIntakeHint")}>
            <Input
              type="number"
              step="50"
              value={avgIntake}
              onChange={(e) => setAvgIntake(e.target.value)}
            />
          </Field>
          <Field label={t("tryCalib.changeLabel")} hint={t("tryCalib.changeHint")}>
            <Input
              type="number"
              step="0.1"
              value={changeKg}
              onChange={(e) => setChangeKg(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {result?.ok ? (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wide text-ink-muted">{t("tryCalib.realTdeeLabel")}</p>
          <p className="nums mt-1 text-4xl font-semibold text-brand-400">
            {fmtKcal(result.real_tdee ?? 0)} <span className="text-lg text-ink-muted">{t("common.kcal")}</span>
          </p>
          <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
            <Stat label={t("tryCalib.avgEaten")} value={`${fmtKcal(result.avg_daily_intake ?? 0)}`} />
            <Stat label={t("tryCalib.trendChange")} value={fmtKgSigned(result.trend_change_kg ?? 0, t("common.kg"))} />
            <Stat label={t("tryCalib.daysCounted")} value={String(result.days ?? 0)} />
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <p>{t("tryCalib.explain")}</p>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <p className="py-6 text-center text-sm text-ink-muted">
            {error ?? result?.reason ?? t("tryCalib.needData")}
          </p>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="nums mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
