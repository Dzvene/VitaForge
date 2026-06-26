"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BarChart3, Flag, Flame, Target, TrendingDown } from "lucide-react";
import { useTrends } from "@/lib/api/hooks";
import type { GoalOut, PeriodSummary, TrendsOut } from "@/lib/api/types";
import { fmtKcal, fmtKg, fmtKgSigned } from "@/lib/format";
import { Badge, Card, CardTitle, EmptyState, Skeleton } from "@/components/ui/primitives";

export default function TrendsPage() {
  const { t } = useTranslation();
  const q = useTrends();

  return (
    <div className="space-y-6">
      <header>
        <p className="label">{t("trends.eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("trends.title")}</h1>
        <p className="mt-1 text-sm text-ink-faint">{t("trends.subtitle")}</p>
      </header>

      {q.isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : q.data ? (
        <Body data={q.data} />
      ) : (
        <Card>
          <p className="text-sm text-danger">{t("trends.loadError")}</p>
        </Card>
      )}
    </div>
  );
}

function Body({ data }: { data: TrendsOut }) {
  const { t } = useTranslation();
  const noData = data.week.days_logged === 0 && data.month.days_logged === 0;

  return (
    <div className="space-y-6">
      {noData && (
        <Card>
          <EmptyState
            icon={<BarChart3 className="h-7 w-7" />}
            title={t("trends.emptyTitle")}
            hint={t("trends.emptyHint")}
          />
        </Card>
      )}

      <GoalCard goal={data.goal} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PeriodCard p={data.week} target={data} />
        <PeriodCard p={data.month} target={data} />
      </div>

      {data.pace && <PaceCard pace={data.pace} />}

      <IntakeChart data={data} />
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalOut }) {
  const { t, i18n } = useTranslation();

  if (goal.status === "no_target") {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <Flag className="h-5 w-5 shrink-0 text-brand-400" />
          <p className="text-sm text-ink-muted">{t("trends.goalNoTarget")}</p>
          <Link
            href="/settings"
            className="ml-auto shrink-0 text-sm font-medium text-brand-400 hover:text-brand-500"
          >
            {t("trends.goalSetCta")}
          </Link>
        </div>
      </Card>
    );
  }

  const kg = (v: number | null) => (v !== null ? fmtKg(v, t("common.kg")) : "—");
  const etaDate =
    goal.eta_date !== null
      ? new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || "en", {
          dateStyle: "medium",
        }).format(new Date(goal.eta_date))
      : null;

  const statusLine: Record<string, string> = {
    no_data: t("trends.goalNoData"),
    reached: t("trends.goalReached"),
    stalled: t("trends.goalStalled", { remaining: kg(goal.remaining_kg) }),
    off_track: t("trends.goalOffTrack", { remaining: kg(goal.remaining_kg) }),
    on_track:
      etaDate && goal.eta_weeks !== null
        ? t("trends.goalOnTrack", {
            remaining: kg(goal.remaining_kg),
            date: etaDate,
            weeks: Math.round(goal.eta_weeks),
          })
        : t("trends.goalNoData"),
  };
  const tone =
    goal.status === "reached" || goal.status === "on_track"
      ? "ok"
      : goal.status === "off_track"
        ? "danger"
        : "warn";

  return (
    <Card>
      <CardTitle
        right={
          goal.status === "reached" ? (
            <Badge tone="ok">{t("trends.goalReachedBadge")}</Badge>
          ) : goal.progress_pct !== null ? (
            <span className="nums text-sm font-medium">{Math.round(goal.progress_pct)}%</span>
          ) : undefined
        }
      >
        {t("trends.goalTitle")}
      </CardTitle>

      {goal.progress_pct !== null && (
        <div className="mb-4">
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full transition-[width] ${tone === "danger" ? "bg-danger" : "bg-brand-500"}`}
              style={{ width: `${goal.progress_pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
            <span className="nums">{kg(goal.start_weight_kg)}</span>
            <span className="nums">
              {t("trends.goalNow")} {kg(goal.current_weight_kg)}
            </span>
            <span className="nums">{kg(goal.target_weight_kg)}</span>
          </div>
        </div>
      )}

      <p className="text-sm text-ink-muted">{statusLine[goal.status]}</p>
    </Card>
  );
}

function PeriodCard({ p, target }: { p: PeriodSummary; target: TrendsOut }) {
  const { t } = useTranslation();
  const title = p.range === "week" ? t("trends.week") : t("trends.month");

  return (
    <Card>
      <CardTitle
        right={
          <span className="text-xs text-ink-faint">
            {t("trends.daysLogged", { logged: p.days_logged, total: p.days_total })}
          </span>
        }
      >
        {title}
      </CardTitle>

      {/* Logging adherence bar */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">{t("trends.loggingAdherence")}</span>
          <span className="nums text-sm font-medium">{Math.round(p.logging_adherence_pct)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width]"
            style={{ width: `${p.logging_adherence_pct}%` }}
          />
        </div>
      </div>

      {p.avg ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              icon={<Flame className="h-4 w-4 text-brand-400" />}
              label={t("trends.avgCalories")}
              value={`${fmtKcal(p.avg.kcal)}`}
              sub={
                p.avg_kcal_delta !== null
                  ? t("trends.vsTarget", {
                      delta: `${p.avg_kcal_delta > 0 ? "+" : ""}${Math.round(p.avg_kcal_delta)}`,
                    })
                  : undefined
              }
            />
            <Stat
              icon={<Target className="h-4 w-4 text-brand-400" />}
              label={t("trends.onTargetDays")}
              value={`${p.on_target_days}/${p.days_logged}`}
              sub={
                p.on_target_pct !== null
                  ? t("trends.onTargetPct", { pct: Math.round(p.on_target_pct) })
                  : undefined
              }
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            <Macro label={t("common.protein")} value={p.avg.protein_g} target={target.target_protein_g} />
            <Macro label={t("common.fat")} value={p.avg.fat_g} target={target.target_fat_g} />
            <Macro label={t("common.carbs")} value={p.avg.carb_g} target={target.target_carb_g} />
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-ink-faint">{t("trends.nothingLogged")}</p>
      )}

      {p.weekly_rate_kg !== null && (
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
          <TrendingDown className="h-4 w-4 text-brand-400" />
          <span className="text-sm text-ink-muted">{t("trends.weightRate")}</span>
          <span className="nums ml-auto text-sm font-medium">
            {fmtKgSigned(p.weekly_rate_kg, t("common.kg"))}/{t("trends.perWeek")}
          </span>
        </div>
      )}
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        {icon}
        {label}
      </div>
      <p className="nums mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

function Macro({ label, value, target }: { label: string; value: number; target: number }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="nums text-lg font-semibold">{Math.round(value)}</p>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="nums text-[11px] text-ink-faint">
        {t("trends.ofTarget", { target: Math.round(target) })}
      </p>
    </div>
  );
}

function PaceCard({ pace }: { pace: NonNullable<TrendsOut["pace"]> }) {
  const { t } = useTranslation();
  if (pace.goal === "maintain") {
    return (
      <Card>
        <CardTitle>{t("trends.pace")}</CardTitle>
        <p className="text-sm text-ink-muted">
          {t("trends.paceMaintain", {
            actual:
              pace.actual_rate_kg_per_week !== null
                ? fmtKgSigned(pace.actual_rate_kg_per_week, t("common.kg"))
                : "—",
          })}
        </p>
      </Card>
    );
  }

  const pct = pace.on_pace_pct;
  const tone = pct === null ? "neutral" : pct >= 70 ? "ok" : pct >= 30 ? "warn" : "danger";
  return (
    <Card>
      <CardTitle right={pct !== null ? <Badge tone={tone}>{Math.round(pct)}%</Badge> : undefined}>
        {t("trends.pace")}
      </CardTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-ink-muted">{t("trends.planned")}</p>
          <p className="nums mt-1 text-xl font-semibold">
            {fmtKgSigned(pace.target_rate_kg_per_week, t("common.kg"))}/{t("trends.perWeek")}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">{t("trends.actual")}</p>
          <p className="nums mt-1 text-xl font-semibold">
            {pace.actual_rate_kg_per_week !== null
              ? `${fmtKgSigned(pace.actual_rate_kg_per_week, t("common.kg"))}/${t("trends.perWeek")}`
              : "—"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-faint">{t("trends.paceHint")}</p>
    </Card>
  );
}

function IntakeChart({ data }: { data: TrendsOut }) {
  const { t } = useTranslation();
  const days = data.daily;
  const logged = days.filter((d) => d.kcal !== null);
  const maxKcal = Math.max(data.target_kcal, ...logged.map((d) => d.kcal ?? 0), 1);
  const targetPct = (data.target_kcal / maxKcal) * 100;

  return (
    <Card>
      <CardTitle right={<span className="nums text-xs text-ink-faint">{t("trends.last30")}</span>}>
        {t("trends.intakeChart")}
      </CardTitle>

      {logged.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">{t("trends.nothingLogged")}</p>
      ) : (
        <>
          <div className="relative h-40">
            {/* target line */}
            <div
              className="absolute inset-x-0 border-t border-dashed border-brand-400/60"
              style={{ bottom: `${targetPct}%` }}
            >
              <span className="absolute -top-4 right-0 nums text-[10px] text-brand-400">
                {fmtKcal(data.target_kcal)} {t("trends.targetShort")}
              </span>
            </div>
            <div className="flex h-full items-end gap-[3px]">
              {days.map((d) => {
                const h = d.kcal !== null ? (d.kcal / maxKcal) * 100 : 0;
                const over = d.kcal !== null && d.kcal > data.target_kcal;
                return (
                  <div
                    key={d.day}
                    className="group relative flex-1"
                    style={{ height: "100%" }}
                    title={d.kcal !== null ? `${d.day}: ${Math.round(d.kcal)} kcal` : `${d.day}: —`}
                  >
                    {d.kcal !== null ? (
                      <div
                        className={`absolute bottom-0 w-full rounded-sm ${over ? "bg-warn/70" : "bg-brand-500/70"} group-hover:opacity-100`}
                        style={{ height: `${Math.max(h, 2)}%` }}
                      />
                    ) : (
                      <div className="absolute bottom-0 h-[2px] w-full rounded-sm bg-line-strong" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-5 text-xs text-ink-faint">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-brand-500/70" /> {t("trends.legendUnder")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-warn/70" /> {t("trends.legendOver")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-line-strong" /> {t("trends.legendMissing")}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
