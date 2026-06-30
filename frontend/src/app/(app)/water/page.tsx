"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Droplets, Trash2 } from "lucide-react";
import { water as waterApi } from "@/lib/api/endpoints";
import { qk, useWaterDay } from "@/lib/api/hooks";
import { addDays, isoDate } from "@/lib/format";
import { useDayLabel } from "@/lib/i18n/useDayLabel";
import { Button, Card, CardTitle } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

const QUICK_ML = [150, 200, 250, 330, 400, 500, 750, 1000];

export default function WaterPage() {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  const qc = useQueryClient();
  const toast = useToast();
  const [day, setDay] = useState(isoDate());
  const { data, isLoading } = useWaterDay(day);

  const log = useMutation({
    mutationFn: (ml: number) => waterApi.log({ logged_on: day, ml }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.water(day) });
      toast(t("water.logged"), "ok");
    },
    onError: () => toast(t("water.logError"), "error"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => waterApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.water(day) });
      toast(t("water.removed"), "ok");
    },
  });

  const total = data?.total_ml ?? 0;
  const goal = data?.goal_ml ?? 2000;
  const pct = Math.min((total / goal) * 100, 100);

  const fmtMl = (ml: number) =>
    ml >= 1000 ? `${(ml / 1000).toFixed(1)} ${t("water.liters")}` : `${ml} ${t("water.ml")}`;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="label">{t("water.eyebrow")}</p>
          <h1 className="text-2xl font-bold tracking-tight">{t("water.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDay(addDays(day, -1))}
            className="rounded-lg border border-line bg-surface-2 p-2 text-ink-muted hover:text-ink"
            aria-label={t("diary.previousDay")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[110px] text-center">
            <p className="text-sm font-semibold">{dayLabel(day)}</p>
          </div>
          <button
            onClick={() => setDay(addDays(day, 1))}
            className="rounded-lg border border-line bg-surface-2 p-2 text-ink-muted hover:text-ink"
            aria-label={t("diary.nextDay")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Hero ring */}
      <Card className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:py-6">
        {/* SVG ring */}
        <div className="relative grid shrink-0 place-items-center" style={{ width: 200, height: 200 }}>
          <svg width={200} height={200} className="-rotate-90">
            <circle cx={100} cy={100} r={82} fill="none" className="stroke-surface-3" strokeWidth={18} />
            <circle
              cx={100} cy={100} r={82} fill="none"
              stroke="rgb(96 165 250)"
              strokeWidth={18}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 82}
              strokeDashoffset={2 * Math.PI * 82 * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <Droplets className="mb-1 h-6 w-6 text-blue-400" />
            <span className="nums text-3xl font-bold text-blue-400">{fmtMl(total)}</span>
            <span className="nums text-xs text-ink-faint">/ {fmtMl(goal)}</span>
          </div>
        </div>

        {/* Quick-add grid */}
        <div className="flex-1 w-full">
          <p className="mb-3 text-sm font-medium text-ink-muted">{t("water.quickAdd")}</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ML.map((ml) => (
              <button
                key={ml}
                onClick={() => log.mutate(ml)}
                disabled={log.isPending}
                className="rounded-xl border border-line bg-surface-2 py-3 text-center text-sm font-medium text-ink-muted transition-colors hover:border-blue-400/40 hover:bg-blue-500/5 hover:text-blue-400 disabled:opacity-50"
              >
                +{fmtMl(ml)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Log entries */}
      {(data?.logs.length ?? 0) > 0 && (
        <Card>
          <CardTitle>{t("water.todayLog")}</CardTitle>
          <ul className="divide-y divide-line">
            {[...(data?.logs ?? [])].reverse().map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-400" />
                  <span className="nums font-medium text-blue-400">{fmtMl(entry.ml)}</span>
                </div>
                <button
                  onClick={() => remove.mutate(entry.id)}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-danger"
                  aria-label={t("common.remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
