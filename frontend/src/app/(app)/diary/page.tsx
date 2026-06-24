"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { diary } from "@/lib/api/endpoints";
import { qk, useDay, useGuidance } from "@/lib/api/hooks";
import { addDays, dayLabel, fmtG, fmtKcal, isoDate, MEALS, MEAL_LABELS } from "@/lib/format";
import type { Meal } from "@/lib/api/types";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { GuidanceList } from "@/components/coaching/coaching";
import { useToast } from "@/components/ui/toast";
import { AddFoodDialog } from "./AddFoodDialog";
import { CustomFoodDialog } from "./CustomFoodDialog";

export default function DiaryPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [day, setDay] = useState(isoDate());
  const [addMeal, setAddMeal] = useState<Meal | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const summary = useDay(day);
  const guidance = useGuidance(day);

  const remove = useMutation({
    mutationFn: (id: number) => diary.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.day(day) });
      qc.invalidateQueries({ queryKey: qk.guidance(day) });
      toast("Entry removed", "ok");
    },
  });

  const copyYesterday = useMutation({
    mutationFn: () => diary.copy(addDays(day, -1), day),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: qk.day(day) });
      qc.invalidateQueries({ queryKey: qk.guidance(day) });
      toast(r.copied ? `Copied ${r.copied} entries` : "Nothing to copy", r.copied ? "ok" : "info");
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
            aria-label="Previous day"
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
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => copyYesterday.mutate()} loading={copyYesterday.isPending}>
          <Copy className="h-4 w-4" /> Copy yesterday
        </Button>
      </header>

      {/* Mini totals */}
      {eaten && target && (
        <div className="card-2 grid grid-cols-4 divide-x divide-line p-0 text-center">
          {[
            ["Calories", `${fmtKcal(eaten.kcal)} / ${fmtKcal(target.calories)}`],
            ["Protein", `${fmtG(eaten.protein_g)} / ${fmtG(target.protein_g)}`],
            ["Fat", `${fmtG(eaten.fat_g)} / ${fmtG(target.fat_g)}`],
            ["Carbs", `${fmtG(eaten.carb_g)} / ${fmtG(target.carb_g)}`],
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
                  <h3 className="text-sm font-semibold">{MEAL_LABELS[meal]}</h3>
                  {mealKcal > 0 && <span className="nums text-xs text-ink-faint">{fmtKcal(mealKcal)} kcal</span>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setAddMeal(meal)}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="py-2 text-sm text-ink-faint">No items yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{e.food_name}</p>
                        <p className="nums text-xs text-ink-faint">
                          {fmtG(e.grams)} · P {Math.round(e.nutrients.protein_g)} F {Math.round(e.nutrients.fat_g)} C{" "}
                          {Math.round(e.nutrients.carb_g)}
                        </p>
                      </div>
                      <span className="nums text-sm font-medium text-ink">{fmtKcal(e.nutrients.kcal)}</span>
                      <button
                        onClick={() => remove.mutate(e.id)}
                        className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-danger"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
          title="Nothing logged for this day"
          hint="Add your first item, or copy yesterday."
          action={
            <Button onClick={() => setAddMeal("breakfast")}>
              <Plus className="h-4 w-4" /> Log food
            </Button>
          }
        />
      )}

      <AddFoodDialog
        open={addMeal !== null}
        onClose={() => setAddMeal(null)}
        day={day}
        defaultMeal={addMeal ?? "breakfast"}
        onCreateCustom={() => {
          setAddMeal(null);
          setCustomOpen(true);
        }}
      />
      <CustomFoodDialog open={customOpen} onClose={() => setCustomOpen(false)} />
    </div>
  );
}
