"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { preview } from "@/lib/api/endpoints";
import { addDays, fmtKg, fmtKgSigned, isoDate } from "@/lib/format";
import { useDayLabel } from "@/lib/i18n/useDayLabel";
import type { WeightSeries } from "@/lib/api/types";
import { Card, CardTitle, Field, Input } from "@/components/ui/primitives";
import { TrendChart } from "@/components/ui/charts";

// A believable two-week cut: a gentle downward drift buried under day-to-day
// water/glycogen noise. Deterministic (no Math.random — SSR-safe) so the demo
// renders identically on server and client.
const NOISE = [0, 0.6, -0.4, 0.9, 0.3, -0.7, 0.5, 1.1, -0.3, 0.2, 0.8, -0.5, 0.4, -0.2];

function defaultSeries(start: number, drift: number) {
  const today = isoDate();
  return NOISE.map((n, i) => ({
    logged_on: addDays(today, -(NOISE.length - 1 - i)),
    weight_kg: Math.round((start + drift * i + n) * 10) / 10,
  }));
}

export function TrendDemo() {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  const [points, setPoints] = useState(() => defaultSeries(80, -0.1));
  const [series, setSeries] = useState<WeightSeries | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Recompute the smoothed trend whenever the raw weigh-ins change (debounced).
  useEffect(() => {
    const id = setTimeout(() => {
      preview
        .weightTrend(points)
        .then((s) => {
          setSeries(s);
          setError(null);
        })
        .catch(() => setError(t("try.errorFallback")));
    }, 250);
    return () => clearTimeout(id);
  }, [points, t]);

  const change = useMemo(() => {
    const pts = series?.points ?? [];
    return pts.length >= 2 ? pts[pts.length - 1].trend_kg - pts[0].trend_kg : null;
  }, [series]);

  const setWeight = (idx: number, value: string) =>
    setPoints((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, weight_kg: Number(value) } : p)),
    );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <CardTitle
          right={
            series?.latest_trend_kg != null && (
              <span className="nums text-sm text-ink-muted">
                {fmtKg(series.latest_trend_kg)} {t("weight.trend")}
              </span>
            )
          }
        >
          {t("tryTrend.chartTitle")}
        </CardTitle>
        {series && series.points.length >= 2 ? (
          <>
            <TrendChart points={series.points} />
            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-ink-faint">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" /> {t("weight.raw")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-brand-400" /> {t("weight.trend")}
              </span>
            </div>
            {change !== null && (
              <p className="mt-4 text-center text-sm text-ink-muted">
                {t("tryTrend.summary")}{" "}
                <span className="nums font-semibold text-ink">{fmtKgSigned(change, t("common.kg"))}</span>{" "}
                {t("tryTrend.summaryTail")}
              </p>
            )}
          </>
        ) : (
          <p className="py-10 text-center text-sm text-ink-muted">{t("tryTrend.needMore")}</p>
        )}
        {error && <p className="mt-2 text-center text-sm text-rose-400">{error}</p>}
      </Card>

      <Card className="p-6">
        <CardTitle>{t("tryTrend.editTitle")}</CardTitle>
        <p className="mb-4 text-sm text-ink-muted">{t("tryTrend.editHint")}</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {points.map((p, i) => (
            <Field key={p.logged_on} label={dayLabel(p.logged_on)}>
              <Input
                type="number"
                step="0.1"
                value={p.weight_kg}
                onChange={(e) => setWeight(i, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
        <p>{t("tryTrend.explain")}</p>
      </div>
    </div>
  );
}
