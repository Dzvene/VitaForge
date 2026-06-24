"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { admin } from "@/lib/api/endpoints";
import type { FoodCreate, FoodOut } from "@/lib/api/types";
import { Badge, Button, Card, Field, Input, Skeleton } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

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

export function FoodsPanel() {
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [editing, setEditing] = useState<FoodOut | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({ queryKey: ["admin", "foods", submitted], queryFn: () => admin.foods(submitted || undefined) });

  const del = useMutation({
    mutationFn: (id: number) => admin.deleteFood(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "foods"] });
      toast("Food deleted", "ok");
    },
    onError: () => toast("Delete failed", "error"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(q.trim());
          }}
          className="relative flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input className="pl-9" placeholder="Search the catalog…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New food
        </Button>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {list.data?.length ? (
              list.data.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{f.name}</p>
                    <p className="nums truncate text-xs text-ink-faint">
                      {f.brand ? `${f.brand} · ` : ""}
                      {Math.round(f.kcal_100g)} kcal /100g
                    </p>
                  </div>
                  <Badge tone="neutral">{f.source}</Badge>
                  <button onClick={() => setEditing(f)} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => del.mutate(f.id)} className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-3 hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-sm text-ink-faint">No foods found.</li>
            )}
          </ul>
        </Card>
      )}

      <FoodForm
        open={creating}
        onClose={() => setCreating(false)}
        title="New catalog food"
        initial={EMPTY}
        onSubmit={async (body) => {
          await admin.createFood(body);
          qc.invalidateQueries({ queryKey: ["admin", "foods"] });
          toast("Food created", "ok");
        }}
      />
      <FoodForm
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit food"
        initial={
          editing
            ? {
                name: editing.name,
                brand: editing.brand,
                barcode: editing.barcode,
                kcal_100g: editing.kcal_100g,
                protein_100g: editing.protein_100g,
                fat_100g: editing.fat_100g,
                carb_100g: editing.carb_100g,
                portions: [],
              }
            : EMPTY
        }
        onSubmit={async (body) => {
          if (editing) await admin.updateFood(editing.id, body);
          qc.invalidateQueries({ queryKey: ["admin", "foods"] });
          toast("Food updated", "ok");
        }}
      />
    </div>
  );
}

function FoodForm({
  open,
  onClose,
  title,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initial: FoodCreate;
  onSubmit: (body: FoodCreate) => Promise<void>;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  // Re-seed when the dialog opens for a different item.
  const [seed, setSeed] = useState(initial.name);
  if (open && seed !== initial.name) {
    setSeed(initial.name);
    setV(initial);
  }

  const num = (k: keyof FoodCreate) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: Number(e.target.value) }));

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSubmit(v);
            onClose();
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-4"
      >
        <Field label="Name">
          <Input required value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} />
        </Field>
        <Field label="Brand">
          <Input value={v.brand ?? ""} onChange={(e) => setV((s) => ({ ...s, brand: e.target.value || null }))} />
        </Field>
        <div className="grid grid-cols-4 gap-3">
          <Field label="kcal">
            <Input type="number" value={v.kcal_100g} onChange={num("kcal_100g")} />
          </Field>
          <Field label="Protein">
            <Input type="number" value={v.protein_100g} onChange={num("protein_100g")} />
          </Field>
          <Field label="Fat">
            <Input type="number" value={v.fat_100g} onChange={num("fat_100g")} />
          </Field>
          <Field label="Carbs">
            <Input type="number" value={v.carb_100g} onChange={num("carb_100g")} />
          </Field>
        </div>
        <Button type="submit" full size="lg" loading={busy} disabled={!v.name}>
          Save
        </Button>
      </form>
    </Dialog>
  );
}
