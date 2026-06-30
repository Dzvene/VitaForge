"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Droplets } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { water as waterApi } from "@/lib/api/endpoints";
import { qk, useWaterDay } from "@/lib/api/hooks";
import { isoDate } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

const QUICK_ML = [150, 250, 330, 500];

export function WaterWidget() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const today = isoDate();
  const { data } = useWaterDay(today);

  const log = useMutation({
    mutationFn: (ml: number) => waterApi.log({ logged_on: today, ml }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.water(today) });
    },
    onError: () => toast(t("water.logError"), "error"),
  });

  const total = data?.total_ml ?? 0;
  const goal = data?.goal_ml ?? 2000;
  const pct = Math.min((total / goal) * 100, 100);

  const fmtMl = (ml: number) =>
    ml >= 1000 ? `${(ml / 1000).toFixed(1)} ${t("water.liters")}` : `${ml} ${t("water.ml")}`;

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10">
            <Droplets className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-sm font-medium text-ink">{t("water.title")}</span>
        </div>
        <Link href="/water" className="text-xs font-medium text-brand-400 hover:text-brand-500">
          {t("common.details")} →
        </Link>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="nums text-xl font-bold text-blue-400">{fmtMl(total)}</span>
          <span className="nums text-xs text-ink-faint">/ {fmtMl(goal)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-blue-400 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Quick-add buttons */}
      <div className="flex gap-1.5">
        {QUICK_ML.map((ml) => (
          <button
            key={ml}
            onClick={() => log.mutate(ml)}
            disabled={log.isPending}
            className={cn(
              "flex-1 rounded-lg border border-line bg-surface-2 py-1.5 text-xs font-medium",
              "text-ink-muted transition-colors hover:border-blue-400/40 hover:bg-blue-500/5 hover:text-blue-400",
              "disabled:opacity-50",
            )}
          >
            +{ml}
          </button>
        ))}
      </div>
    </div>
  );
}
