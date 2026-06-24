"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Heart, Plus, Search, Star } from "lucide-react";
import { diary, foods } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/hooks";
import { MEAL_LABELS } from "@/lib/format";
import type { FoodOut, Meal } from "@/lib/api/types";
import { Button, Field, Input, Segmented, Spinner } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

function macroLine(f: FoodOut) {
  return `${Math.round(f.kcal_100g)} kcal · P ${Math.round(f.protein_100g)} F ${Math.round(
    f.fat_100g,
  )} C ${Math.round(f.carb_100g)} /100g`;
}

export function AddFoodDialog({
  open,
  onClose,
  day,
  defaultMeal,
  onCreateCustom,
}: {
  open: boolean;
  onClose: () => void;
  day: string;
  defaultMeal: Meal;
  onCreateCustom: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<"search" | "recent" | "favorites">("recent");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<FoodOut | null>(null);

  // quantity step
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [mode, setMode] = useState<"grams" | "portion">("grams");
  const [grams, setGrams] = useState("100");
  const [portionId, setPortionId] = useState<number | null>(null);
  const [count, setCount] = useState("1");

  const search = useQuery({
    queryKey: ["foods", "search", submitted],
    queryFn: () => foods.search(submitted),
    enabled: tab === "search" && submitted.length > 0,
  });
  const recent = useQuery({ queryKey: qk.recent, queryFn: diary.recentFoods, enabled: tab === "recent" });
  const favorites = useQuery({ queryKey: ["foods", "favorites"], queryFn: foods.favorites, enabled: tab === "favorites" });

  const list = tab === "search" ? search.data : tab === "recent" ? recent.data : favorites.data;
  const loading = tab === "search" ? search.isFetching : tab === "recent" ? recent.isLoading : favorites.isLoading;

  const add = useMutation({
    mutationFn: () =>
      diary.add({
        entry_date: day,
        meal,
        food_id: selected!.id,
        grams: mode === "grams" ? Number(grams) : null,
        portion_id: mode === "portion" ? portionId : null,
        portion_count: mode === "portion" ? Number(count) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.day(day) });
      qc.invalidateQueries({ queryKey: qk.guidance(day) });
      qc.invalidateQueries({ queryKey: qk.recent });
      toast("Added to diary", "ok");
      reset();
      onClose();
    },
    onError: () => toast("Could not add entry", "error"),
  });

  function reset() {
    setSelected(null);
    setMode("grams");
    setGrams("100");
    setPortionId(null);
    setCount("1");
  }
  function pick(f: FoodOut) {
    setSelected(f);
    setMeal(defaultMeal);
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={selected ? selected.name : `Add to ${MEAL_LABELS[defaultMeal]}`}
    >
      {!selected ? (
        <div className="space-y-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "recent", label: "Recent" },
              { value: "favorites", label: "Favorites" },
              { value: "search", label: "Search" },
            ]}
          />

          {tab === "search" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(query.trim());
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  className="pl-9"
                  placeholder="Search foods…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" variant="secondary">
                Go
              </Button>
            </form>
          )}

          <div className="max-h-[46vh] space-y-1.5 overflow-y-auto">
            {loading ? (
              <div className="grid place-items-center py-8">
                <Spinner />
              </div>
            ) : list && list.length > 0 ? (
              list.map((f) => (
                <button
                  key={f.id}
                  onClick={() => pick(f)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-line-strong hover:bg-surface-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{f.name}</p>
                    <p className="nums truncate text-xs text-ink-faint">
                      {f.brand ? `${f.brand} · ` : ""}
                      {macroLine(f)}
                    </p>
                  </div>
                  {f.source === "custom" && <Star className="h-3.5 w-3.5 text-ink-faint" />}
                  <Plus className="h-4 w-4 text-brand-400" />
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-ink-faint">
                {tab === "search" && !submitted ? "Type to search." : "Nothing here yet."}
              </p>
            )}
          </div>

          <Button variant="ghost" full onClick={onCreateCustom}>
            <Plus className="h-4 w-4" /> Create a custom food
          </Button>
        </div>
      ) : (
        <QuantityStep
          food={selected}
          meal={meal}
          setMeal={setMeal}
          mode={mode}
          setMode={setMode}
          grams={grams}
          setGrams={setGrams}
          portionId={portionId}
          setPortionId={setPortionId}
          count={count}
          setCount={setCount}
          onBack={() => setSelected(null)}
          onAdd={() => add.mutate()}
          adding={add.isPending}
          qc={qc}
        />
      )}
    </Dialog>
  );
}

function QuantityStep(props: {
  food: FoodOut;
  meal: Meal;
  setMeal: (m: Meal) => void;
  mode: "grams" | "portion";
  setMode: (m: "grams" | "portion") => void;
  grams: string;
  setGrams: (s: string) => void;
  portionId: number | null;
  setPortionId: (n: number | null) => void;
  count: string;
  setCount: (s: string) => void;
  onBack: () => void;
  onAdd: () => void;
  adding: boolean;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { food, mode, grams, portionId, count } = props;
  const toast = useToast();

  const portion = food.portions.find((p) => p.id === portionId) ?? food.portions[0];
  const effGrams = mode === "grams" ? Number(grams) || 0 : (portion?.grams ?? 0) * (Number(count) || 0);
  const factor = effGrams / 100;
  const kcal = Math.round(food.kcal_100g * factor);

  const fav = useMutation({
    mutationFn: () => foods.addFavorite(food.id),
    onSuccess: () => {
      props.qc.invalidateQueries({ queryKey: ["foods", "favorites"] });
      toast("Saved to favorites", "ok");
    },
  });

  return (
    <div className="space-y-5">
      <button onClick={props.onBack} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-xl bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <p className="nums text-2xl font-semibold">{kcal} kcal</p>
          <button onClick={() => fav.mutate()} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-danger">
            <Heart className="h-4 w-4" />
          </button>
        </div>
        <p className="nums mt-1 text-xs text-ink-faint">
          P {Math.round(food.protein_100g * factor)} · F {Math.round(food.fat_100g * factor)} · C{" "}
          {Math.round(food.carb_100g * factor)} g
        </p>
      </div>

      <Field label="Meal">
        <Segmented
          value={props.meal}
          onChange={props.setMeal}
          options={[
            { value: "breakfast", label: "B'fast" },
            { value: "lunch", label: "Lunch" },
            { value: "dinner", label: "Dinner" },
            { value: "snack", label: "Snack" },
          ]}
        />
      </Field>

      {food.portions.length > 0 && (
        <Segmented
          value={mode}
          onChange={props.setMode}
          options={[
            { value: "grams", label: "Grams" },
            { value: "portion", label: "Portions" },
          ]}
        />
      )}

      {mode === "grams" ? (
        <Field label="Amount (grams)">
          <Input type="number" min={1} value={grams} onChange={(e) => props.setGrams(e.target.value)} autoFocus />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Portion">
            <select
              className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm"
              value={portion?.id}
              onChange={(e) => props.setPortionId(Number(e.target.value))}
            >
              {food.portions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.grams} g)
                </option>
              ))}
            </select>
          </Field>
          <Field label="How many">
            <Input type="number" step="0.5" min={0.5} value={count} onChange={(e) => props.setCount(e.target.value)} />
          </Field>
        </div>
      )}

      <Button full size="lg" loading={props.adding} onClick={props.onAdd} disabled={effGrams <= 0}>
        Add {effGrams > 0 ? `· ${Math.round(effGrams)} g` : ""}
      </Button>
    </div>
  );
}
