"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { admin, ApiError, type FoodCreate, type FoodOut } from "@/lib/api";
import { Badge, Button, Card, Input, Spinner } from "@/components/primitives";

const EMPTY: FoodCreate = {
  name: "",
  brand: null,
  barcode: null,
  kcal_100g: 0,
  protein_100g: 0,
  fat_100g: 0,
  carb_100g: 0,
  portions: [],
};

export default function FoodsPage() {
  const [foods, setFoods] = useState<FoodOut[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [editing, setEditing] = useState<FoodOut | null>(null);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = (query: string) => {
    setFoods(null);
    setError(false);
    admin
      .foods(query || undefined)
      .then(setFoods)
      .catch(() => setError(true));
  };

  useEffect(() => {
    load(submitted);
  }, [submitted]);

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2500);
  };

  const remove = async (f: FoodOut) => {
    if (!confirm(`Delete "${f.name}" from the catalog? This can't be undone.`)) return;
    try {
      await admin.deleteFood(f.id);
      setFoods((prev) => prev?.filter((x) => x.id !== f.id) ?? null);
      flash("Food deleted");
    } catch {
      flash("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Catalog</p>
          <h1 className="text-2xl font-semibold tracking-tight">Foods</h1>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(q.trim());
            }}
            className="relative flex-1 sm:w-64"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              className="pl-9"
              placeholder="Search the catalog…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New food
          </Button>
        </div>
      </header>

      {note && <p className="text-sm text-ink-muted">{note}</p>}

      {error ? (
        <Card>
          <p className="text-sm text-danger">Couldn&apos;t load the catalog.</p>
        </Card>
      ) : !foods ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {foods.length ? (
              foods.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{f.name}</p>
                    <p className="nums truncate text-xs text-ink-faint">
                      {f.brand ? `${f.brand} · ` : ""}
                      {Math.round(f.kcal_100g)} kcal /100g · P{Math.round(f.protein_100g)} F
                      {Math.round(f.fat_100g)} C{Math.round(f.carb_100g)}
                      {f.barcode ? ` · ${f.barcode}` : ""}
                    </p>
                  </div>
                  <Badge tone="neutral">{f.source}</Badge>
                  <button
                    onClick={() => setEditing(f)}
                    aria-label="Edit"
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(f)}
                    aria-label="Delete"
                    className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-10 text-center text-sm text-ink-faint">No foods found.</li>
            )}
          </ul>
        </Card>
      )}

      {creating && (
        <FoodModal
          title="New catalog food"
          initial={EMPTY}
          onClose={() => setCreating(false)}
          onSubmit={async (body) => {
            const created = await admin.createFood(body);
            setFoods((prev) => (prev ? [created, ...prev] : [created]));
            flash("Food created");
          }}
        />
      )}
      {editing && (
        <FoodModal
          title="Edit food"
          initial={{
            name: editing.name,
            brand: editing.brand,
            barcode: editing.barcode,
            kcal_100g: editing.kcal_100g,
            protein_100g: editing.protein_100g,
            fat_100g: editing.fat_100g,
            carb_100g: editing.carb_100g,
            portions: editing.portions.map((p) => ({ name: p.name, grams: p.grams })),
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (body) => {
            const updated = await admin.updateFood(editing.id, body);
            setFoods((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
            flash("Food updated");
          }}
        />
      )}
    </div>
  );
}

function FoodModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: FoodCreate;
  onClose: () => void;
  onSubmit: (body: FoodCreate) => Promise<void>;
}) {
  const [v, setV] = useState<FoodCreate>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = (k: keyof FoodCreate) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: Number(e.target.value) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(v);
      onClose();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.detail : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <L label="Name">
            <Input required value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} />
          </L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Brand">
              <Input
                value={v.brand ?? ""}
                onChange={(e) => setV((s) => ({ ...s, brand: e.target.value || null }))}
              />
            </L>
            <L label="Barcode">
              <Input
                value={v.barcode ?? ""}
                onChange={(e) => setV((s) => ({ ...s, barcode: e.target.value || null }))}
              />
            </L>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <L label="kcal">
              <Input type="number" step="any" value={v.kcal_100g} onChange={num("kcal_100g")} />
            </L>
            <L label="Protein">
              <Input type="number" step="any" value={v.protein_100g} onChange={num("protein_100g")} />
            </L>
            <L label="Fat">
              <Input type="number" step="any" value={v.fat_100g} onChange={num("fat_100g")} />
            </L>
            <L label="Carbs">
              <Input type="number" step="any" value={v.carb_100g} onChange={num("carb_100g")} />
            </L>
          </div>
          <p className="text-xs text-ink-faint">Macros are per 100 g.</p>
          {err && <p className="text-sm text-danger">{err}</p>}
          <Button type="submit" full loading={busy} disabled={!v.name.trim()}>
            Save
          </Button>
        </form>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
