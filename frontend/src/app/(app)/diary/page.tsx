"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";
import { diary } from "@/lib/api/endpoints";
import { qk, useDay, useGuidance } from "@/lib/api/hooks";
import { addDays, fmtG, fmtKcal, isoDate, MEALS } from "@/lib/format";
import { useDayLabel } from "@/lib/i18n/useDayLabel";
import type { Meal } from "@/lib/api/types";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { GuidanceList } from "@/components/coaching/coaching";
import { useToast } from "@/components/ui/toast";
import { AddFoodDialog } from "./AddFoodDialog";
import { CustomFoodDialog } from "./CustomFoodDialog";

export default function DiaryPage() {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  const qc = useQueryClient();
  const toast = useToast();
  const [day, setDay] = useState(isoDate());
  const [addMeal, setAddMeal] = useState<Meal | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customBarcode, setCustomBarcode] = useState<string | undefined>();
  const [editing, setEditing] = useState<{ id: number; grams: string } | null>(null);

  const summary = useDay(day);
  const guidance = useGuidance(day);

  const remove = useMutation({
    mutationFn: (id: number) => diary.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.day(day) });
      qc.invalidateQueries({ queryKey: qk.guidance(day) });
      toast(t("diary.entryRemoved"), "ok");
    },
  });

  const update = useMutation({
    mutationFn: ({ id, grams }: { id: number; grams: number }) => diary.update(id, grams),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.day(day) });
      qc.invalidateQueries({ queryKey: qk.guidance(day) });
      setEditing(null);
      toast(t("diary.entryUpdated"), "ok");
    },
    onError: () => toast(t("diary.entryUpdateError"), "error"),
  });

  const saveEdit = () => {
    if (!editing) return;
    const grams = Number(editing.grams);
    if (!Number.isFinite(grams) || grams <= 0) return;
    update.mutate({ id: editing.id, grams });
  };

  const copyYesterday = useMutation({
    mutationFn: () => diary.copy(addDays(day, -1), day),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: qk.day(day) });
      qc.invalidateQueries({ queryKey: qk.guidance(day) });
      toast(
        r.copied ? t("diary.copiedEntries", { count: r.copied }) : t("diary.nothingToCopy"),
        r.copied ? "ok" : "info",
      );
    },
  });

  const entries = summary.data?.entries ?? [];
  const byMeal = (m: Meal) => entries.filter((e) => e.meal === m);
  const eaten = summary.data?.eaten;
  const target = summary.data?.target;

  return (
    <div className="space-y-6">
      {/* Day nav */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDay(addDays(day, -1))}
            className="rounded-lg border border-line bg-surface-2 p-2 text-ink-muted hover:text-ink"
            aria-label={t("diary.previousDay")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[140px] text-center">
            <p className="text-lg font-semibold tracking-tight">{dayLabel(day)}</p>
            <p className="nums text-xs text-ink-faint">{day}</p>
          </div>
          <button
            onClick={() => setDay(addDays(day, 1))}
            className="rounded-lg border border-line bg-surface-2 p-2 text-ink-muted hover:text-ink"
            aria-label={t("diary.nextDay")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => copyYesterday.mutate()} loading={copyYesterday.isPending}>
          <Copy className="h-4 w-4" /> {t("diary.copyYesterday")}
        </Button>
      </header>

      {/* Mini totals */}
      {eaten && target && (
        <div className="card-2 grid grid-cols-4 divide-x divide-line p-0 text-center">
          {[
            [t("common.calories"), `${fmtKcal(eaten.kcal)} / ${fmtKcal(target.calories)}`],
            [t("common.protein"), `${fmtG(eaten.protein_g, t("common.grams"))} / ${fmtG(target.protein_g, t("common.grams"))}`],
            [t("common.fat"), `${fmtG(eaten.fat_g, t("common.grams"))} / ${fmtG(target.fat_g, t("common.grams"))}`],
            [t("common.carbs"), `${fmtG(eaten.carb_g, t("common.grams"))} / ${fmtG(target.carb_g, t("common.grams"))}`],
          ].map(([k, v]) => (
            <div key={k} className="px-2 py-3">
              <p className="label">{k}</p>
              <p className="nums mt-1 text-sm font-medium text-ink">{v}</p>
            </div>
          ))}
        </div>
      )}

      {guidance.data?.items?.length ? <GuidanceList items={guidance.data.items} /> : null}

      {/* Meals */}
      {summary.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        MEALS.map((meal) => {
          const items = byMeal(meal);
          const mealKcal = items.reduce((s, e) => s + e.nutrients.kcal, 0);
          return (
            <Card key={meal}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold">{t("enums.meal." + meal)}</h3>
                  {mealKcal > 0 && (
                    <span className="nums text-xs text-ink-faint">
                      {fmtKcal(mealKcal)} {t("common.kcal")}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setAddMeal(meal)}>
                  <Plus className="h-4 w-4" /> {t("common.add")}
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="py-2 text-sm text-ink-faint">{t("diary.noItemsYet")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{e.food_name}</p>
                        <p className="nums text-xs text-ink-faint">
                          {fmtG(e.grams, t("common.grams"))} · P {Math.round(e.nutrients.protein_g)} F {Math.round(e.nutrients.fat_g)} C{" "}
                          {Math.round(e.nutrients.carb_g)}
                        </p>
                      </div>
                      {editing?.id === e.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            inputMode="decimal"
                            autoFocus
                            value={editing.grams}
                            onChange={(ev) => setEditing({ id: e.id, grams: ev.target.value })}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") saveEdit();
                              if (ev.key === "Escape") setEditing(null);
                            }}
                            className="nums w-20 rounded-lg border border-line bg-surface px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-ink-faint">{t("common.grams")}</span>
                          <button
                            onClick={saveEdit}
                            disabled={update.isPending}
                            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-brand"
                            aria-label={t("common.save")}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3"
                            aria-label={t("common.cancel")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="nums text-sm font-medium text-ink">{fmtKcal(e.nutrients.kcal)}</span>
                          <button
                            onClick={() => setEditing({ id: e.id, grams: String(Math.round(e.grams)) })}
                            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-brand"
                            aria-label={t("common.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove.mutate(e.id)}
                            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-danger"
                            aria-label={t("common.remove")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })
      )}

      {entries.length === 0 && !summary.isLoading && (
        <EmptyState
          icon={<UtensilsCrossed className="h-7 w-7" />}
          title={t("diary.emptyTitle")}
          hint={t("diary.emptyHint")}
          action={
            <Button onClick={() => setAddMeal("breakfast")}>
              <Plus className="h-4 w-4" /> {t("diary.logFood")}
            </Button>
          }
        />
      )}

      <AddFoodDialog
        open={addMeal !== null}
        onClose={() => setAddMeal(null)}
        day={day}
        defaultMeal={addMeal ?? "breakfast"}
        onCreateCustom={(barcode) => {
          setAddMeal(null);
          setCustomBarcode(barcode);
          setCustomOpen(true);
        }}
      />
      <CustomFoodDialog
        open={customOpen}
        onClose={() => { setCustomOpen(false); setCustomBarcode(undefined); }}
        initialBarcode={customBarcode}
      />
    </div>
  );
}
