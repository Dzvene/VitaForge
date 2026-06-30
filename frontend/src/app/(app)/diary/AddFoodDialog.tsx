"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Link from "next/link";
import { ArrowLeft, Barcode, Camera, ChefHat, Heart, Plus, Search, Star } from "lucide-react";
import { diary, foods, recipes } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/hooks";
import type { FoodOut, Meal, RecipeOut } from "@/lib/api/types";
import { Button, Field, Input, Segmented, Spinner } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { BarcodeScannerDialog } from "@/components/ui/BarcodeScannerDialog";

// Common log amounts for foods without named portions (one-tap, still editable).
const QUICK_GRAMS = [30, 50, 100, 150, 200, 250];
// One-tap portion counts (mirror of QUICK_GRAMS for the named-portion path).
const QUICK_COUNTS = [0.5, 1, 1.5, 2, 3];

function macroLine(f: FoodOut, t: TFunction) {
  return `${Math.round(f.kcal_100g)} ${t("common.kcal")} · P ${Math.round(f.protein_100g)} F ${Math.round(
    f.fat_100g,
  )} C ${Math.round(f.carb_100g)} ${t("common.per100g")}`;
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
  onCreateCustom: (barcode?: string) => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<"search" | "recent" | "favorites" | "recipes">("recent");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selected, setSelected] = useState<FoodOut | null>(null);

  const lookup = useMutation({
    mutationFn: (code: string) => foods.byBarcode(code),
    onSuccess: (food) => {
      setBarcode("");
      pick(food);
    },
    onError: (_err, code) => {
      // Product not found in DB or OFF → open custom creation with barcode pre-filled.
      onCreateCustom(code);
    },
  });

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
  const recipeList = useQuery({ queryKey: qk.recipes, queryFn: recipes.list, enabled: tab === "recipes" });

  const logRecipe = useMutation({
    mutationFn: (id: number) => recipes.log(id, { entry_date: day, meal: defaultMeal }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: qk.day(day) });
      qc.invalidateQueries({ queryKey: qk.guidance(day) });
      qc.invalidateQueries({ queryKey: qk.recent });
      toast(t("recipes.loggedToast", { count: res.added }), "ok");
      onClose();
    },
    onError: () => toast(t("diary.addFood.addError"), "error"),
  });

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
      toast(t("diary.addFood.added"), "ok");
      reset();
      onClose();
    },
    onError: () => toast(t("diary.addFood.addError"), "error"),
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
      title={selected ? selected.name : t("diary.addFood.titleAddTo", { meal: t("enums.meal." + defaultMeal) })}
    >
      {!selected ? (
        <div className="space-y-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "recent", label: t("diary.addFood.tabRecent") },
              { value: "favorites", label: t("diary.addFood.tabFavorites") },
              { value: "recipes", label: t("diary.addFood.tabRecipes") },
              { value: "search", label: t("common.search") },
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
                  placeholder={t("diary.addFood.searchPlaceholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" variant="secondary">
                {t("diary.addFood.go")}
              </Button>
            </form>
          )}

          {tab === "search" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = barcode.trim();
                if (code) lookup.mutate(code);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  className="pl-9"
                  placeholder={t("diary.addFood.barcodePlaceholder")}
                  inputMode="numeric"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink"
                aria-label={t("diary.addFood.scanCamera") ?? "Scan with camera"}
              >
                <Camera className="h-4 w-4" />
              </button>
              <Button type="submit" variant="secondary" loading={lookup.isPending}>
                {t("diary.addFood.find")}
              </Button>
            </form>
          )}

          <BarcodeScannerDialog
            open={scannerOpen}
            onDetected={(code) => {
              setScannerOpen(false);
              lookup.mutate(code);
            }}
            onClose={() => setScannerOpen(false)}
          />

          {tab === "recipes" ? (
            <>
              <div className="max-h-[46vh] space-y-1.5 overflow-y-auto">
                {recipeList.isLoading ? (
                  <div className="grid place-items-center py-8">
                    <Spinner />
                  </div>
                ) : recipeList.data && recipeList.data.length > 0 ? (
                  recipeList.data.map((r: RecipeOut) => (
                    <button
                      key={r.id}
                      onClick={() => logRecipe.mutate(r.id)}
                      disabled={logRecipe.isPending}
                      className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-line-strong hover:bg-surface-3 disabled:opacity-50"
                    >
                      <ChefHat className="h-4 w-4 shrink-0 text-brand-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                        <p className="nums truncate text-xs text-ink-faint">
                          {Math.round(r.totals.kcal)} {t("common.kcal")} ·{" "}
                          {t("recipes.itemCount", { count: r.components.length })}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-brand-400" />
                    </button>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-ink-faint">{t("recipes.emptyTitle")}</p>
                )}
              </div>
              <Link href="/recipes">
                <Button variant="ghost" full>
                  <ChefHat className="h-4 w-4" /> {t("recipes.manage")}
                </Button>
              </Link>
            </>
          ) : (
            <>
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
                          {macroLine(f, t)}
                        </p>
                      </div>
                      {f.source === "custom" && <Star className="h-3.5 w-3.5 text-ink-faint" />}
                      <Plus className="h-4 w-4 text-brand-400" />
                    </button>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-ink-faint">
                    {tab === "search" && !submitted ? t("diary.addFood.typeToSearch") : t("diary.addFood.nothingHere")}
                  </p>
                )}
              </div>

              <Button variant="ghost" full onClick={() => onCreateCustom()}>
                <Plus className="h-4 w-4" /> {t("diary.addFood.createCustom")}
              </Button>
            </>
          )}
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
  const { t } = useTranslation();
  const { food, mode, grams, portionId, count } = props;
  const toast = useToast();

  const portion = food.portions.find((p) => p.id === portionId) ?? food.portions[0];
  const effGrams = mode === "grams" ? Number(grams) || 0 : (portion?.grams ?? 0) * (Number(count) || 0);
  const factor = effGrams / 100;
  const kcal = Math.round(food.kcal_100g * factor);

  const favorites = useQuery({ queryKey: ["foods", "favorites"], queryFn: foods.favorites });
  const isFav = favorites.data?.some((f) => f.id === food.id) ?? false;

  const fav = useMutation({
    mutationFn: () => (isFav ? foods.removeFavorite(food.id) : foods.addFavorite(food.id)),
    onSuccess: () => {
      props.qc.invalidateQueries({ queryKey: ["foods", "favorites"] });
      toast(isFav ? t("diary.addFood.favRemoved") : t("diary.addFood.favSaved"), "ok");
    },
    onError: () => toast(t("diary.addFood.favError"), "error"),
  });

  return (
    <div className="space-y-5">
      <button onClick={props.onBack} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {t("diary.addFood.back")}
      </button>

      <div className="rounded-xl bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <p className="nums text-2xl font-semibold">
            {kcal} {t("common.kcal")}
          </p>
          <button
            onClick={() => fav.mutate()}
            disabled={fav.isPending}
            aria-pressed={isFav}
            aria-label={isFav ? t("diary.addFood.removeFromFavorites") : t("diary.addFood.saveToFavorites")}
            className={`rounded-lg p-1.5 hover:bg-surface-3 ${
              isFav ? "text-danger" : "text-ink-muted hover:text-danger"
            }`}
          >
            <Heart className="h-4 w-4" fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="nums mt-1 text-xs text-ink-faint">
          P {Math.round(food.protein_100g * factor)} · F {Math.round(food.fat_100g * factor)} · C{" "}
          {Math.round(food.carb_100g * factor)} {t("common.grams")}
        </p>
      </div>

      <Field label={t("diary.addFood.mealLabel")}>
        <Segmented
          value={props.meal}
          onChange={props.setMeal}
          options={[
            { value: "breakfast", label: t("enums.meal.breakfast") },
            { value: "lunch", label: t("enums.meal.lunch") },
            { value: "dinner", label: t("enums.meal.dinner") },
            { value: "snack", label: t("enums.meal.snack") },
          ]}
        />
      </Field>

      {food.portions.length > 0 && (
        <Segmented
          value={mode}
          onChange={props.setMode}
          options={[
            { value: "grams", label: t("diary.addFood.modeGrams") },
            { value: "portion", label: t("diary.addFood.modePortions") },
          ]}
        />
      )}

      {mode === "grams" ? (
        <Field label={t("diary.addFood.amountGrams")}>
          <Input type="number" min={1} value={grams} onChange={(e) => props.setGrams(e.target.value)} autoFocus />
          {/* One-tap common amounts — most catalog rows (USDA/OFF) carry no
              named portions, so this kills the "type grams every time" friction. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_GRAMS.map((g) => {
              const active = Number(grams) === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => props.setGrams(String(g))}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-brand-500/40 bg-brand-500/15 text-brand-400"
                      : "border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {g} {t("common.grams")}
                </button>
              );
            })}
          </div>
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("diary.addFood.portion")}>
            <select
              className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm"
              value={portion?.id}
              onChange={(e) => props.setPortionId(Number(e.target.value))}
            >
              {food.portions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.grams} {t("common.grams")})
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("diary.addFood.howMany")}>
            <Input type="number" step="0.5" min={0.5} value={count} onChange={(e) => props.setCount(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_COUNTS.map((c) => {
                const active = Number(count) === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => props.setCount(String(c))}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-brand-500/40 bg-brand-500/15 text-brand-400"
                        : "border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    ×{c}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      )}

      <Button full size="lg" loading={props.adding} onClick={props.onAdd} disabled={effGrams <= 0}>
        {effGrams > 0
          ? t("diary.addFood.addWithGrams", { grams: Math.round(effGrams) })
          : t("common.add")}
      </Button>
    </div>
  );
}
