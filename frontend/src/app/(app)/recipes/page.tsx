"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChefHat, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { foods, recipes } from "@/lib/api/endpoints";
import { qk, useRecipes } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import type { FoodOut, RecipeOut } from "@/lib/api/types";
import { Button, Card, EmptyState, Field, Input, Skeleton, Spinner } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface Draft {
  food_id: number;
  food_name: string;
  grams: number;
  kcal_100g: number;
  protein_100g: number;
  fat_100g: number;
  carb_100g: number;
}

export default function RecipesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const list = useRecipes();
  const [editing, setEditing] = useState<RecipeOut | null>(null);
  const [creating, setCreating] = useState(false);

  const del = useMutation({
    mutationFn: (id: number) => recipes.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.recipes });
      toast(t("recipes.deleted"), "ok");
    },
    onError: () => toast(t("recipes.deleteError"), "error"),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">{t("recipes.eyebrow")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("recipes.title")}</h1>
          <p className="mt-1 text-sm text-ink-faint">{t("recipes.subtitle")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t("recipes.new")}
        </Button>
      </header>

      {list.isLoading ? (
        <Skeleton className="h-40" />
      ) : list.data && list.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.data.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">{r.name}</h3>
                  <p className="nums mt-0.5 text-xs text-ink-faint">
                    {Math.round(r.totals.kcal)} {t("common.kcal")} · P{Math.round(r.totals.protein_g)} F
                    {Math.round(r.totals.fat_g)} C{Math.round(r.totals.carb_g)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing(r)}
                    aria-label={t("common.edit")}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("recipes.deleteConfirm", { name: r.name }))) del.mutate(r.id);
                    }}
                    aria-label={t("common.delete")}
                    className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ul className="mt-3 space-y-1 border-t border-line pt-3">
                {r.components.map((c) => (
                  <li key={c.food_id} className="flex justify-between text-sm">
                    <span className="truncate text-ink-muted">{c.food_name}</span>
                    <span className="nums shrink-0 text-ink-faint">
                      {Math.round(c.grams)} {t("common.grams")}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<ChefHat className="h-7 w-7" />}
            title={t("recipes.emptyTitle")}
            hint={t("recipes.emptyHint")}
          />
        </Card>
      )}

      {(creating || editing) && (
        <RecipeEditor
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: qk.recipes });
            setCreating(false);
            setEditing(null);
            toast(t("recipes.saved"), "ok");
          }}
        />
      )}
    </div>
  );
}

function RecipeEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: RecipeOut | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [comps, setComps] = useState<Draft[]>(
    initial
      ? initial.components.map((c) => ({
          food_id: c.food_id,
          food_name: c.food_name,
          grams: c.grams,
          // back-compute per-100g from the stored component nutrients
          kcal_100g: c.grams ? (c.nutrients.kcal / c.grams) * 100 : 0,
          protein_100g: c.grams ? (c.nutrients.protein_g / c.grams) * 100 : 0,
          fat_100g: c.grams ? (c.nutrients.fat_g / c.grams) * 100 : 0,
          carb_100g: c.grams ? (c.nutrients.carb_g / c.grams) * 100 : 0,
        }))
      : [],
  );
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = comps.reduce((kc, c) => kc + (c.kcal_100g * c.grams) / 100, 0);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const body = {
        name: name.trim(),
        components: comps.map((c) => ({ food_id: c.food_id, grams: c.grams })),
      };
      if (initial) await recipes.update(initial.id, body);
      else await recipes.create(body);
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.detail : t("recipes.saveError"));
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={initial ? t("recipes.editTitle") : t("recipes.newTitle")}>
      {adding ? (
        <FoodPicker
          onCancel={() => setAdding(false)}
          onPick={(f) => {
            setComps((prev) => [
              ...prev,
              {
                food_id: f.id,
                food_name: f.name,
                grams: 100,
                kcal_100g: f.kcal_100g,
                protein_100g: f.protein_100g,
                fat_100g: f.fat_100g,
                carb_100g: f.carb_100g,
              },
            ]);
            setAdding(false);
          }}
        />
      ) : (
        <div className="space-y-4">
          <Field label={t("recipes.nameLabel")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("recipes.namePlaceholder")} />
          </Field>

          <div className="space-y-2">
            {comps.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-faint">{t("recipes.noComponents")}</p>
            ) : (
              comps.map((c, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{c.food_name}</span>
                  <Input
                    type="number"
                    min={1}
                    value={c.grams}
                    onChange={(e) =>
                      setComps((prev) => prev.map((x, j) => (j === i ? { ...x, grams: Number(e.target.value) } : x)))
                    }
                    className="w-20"
                  />
                  <span className="text-xs text-ink-faint">{t("common.grams")}</span>
                  <button
                    onClick={() => setComps((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={t("common.remove")}
                    className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <Button variant="secondary" full onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> {t("recipes.addFood")}
          </Button>

          <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink-muted">{t("recipes.totalLabel")}</span>
            <span className="nums font-semibold">
              {Math.round(total)} {t("common.kcal")}
            </span>
          </div>

          {err && <p className="text-sm text-danger">{err}</p>}
          <Button full size="lg" loading={busy} disabled={!name.trim() || comps.length === 0} onClick={save}>
            {t("recipes.saveBtn")}
          </Button>
        </div>
      )}
    </Dialog>
  );
}

function FoodPicker({ onPick, onCancel }: { onPick: (f: FoodOut) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodOut[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      setResults(await foods.search(q.trim()));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={onCancel} className="text-sm text-ink-muted hover:text-ink">
        ← {t("common.back")}
      </button>
      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("recipes.searchFood")} autoFocus />
        </div>
        <Button type="submit" variant="secondary">
          {t("diary.addFood.go")}
        </Button>
      </form>
      <div className="max-h-[44vh] space-y-1.5 overflow-y-auto">
        {loading ? (
          <div className="grid place-items-center py-8">
            <Spinner />
          </div>
        ) : results && results.length > 0 ? (
          results.map((f) => (
            <button
              key={f.id}
              onClick={() => onPick(f)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left hover:border-line-strong hover:bg-surface-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="nums truncate text-xs text-ink-faint">
                  {f.brand ? `${f.brand} · ` : ""}
                  {Math.round(f.kcal_100g)} {t("common.kcal")} {t("common.per100g")}
                </p>
              </div>
              <Plus className="h-4 w-4 text-brand-400" />
            </button>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-ink-faint">
            {results ? t("diary.addFood.nothingHere") : t("diary.addFood.typeToSearch")}
          </p>
        )}
      </div>
    </div>
  );
}
