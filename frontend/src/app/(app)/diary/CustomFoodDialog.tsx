"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { foods } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/hooks";
import type { FoodCreate } from "@/lib/api/types";
import { Button, Field, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function CustomFoodDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ name: "", brand: "", kcal: "", protein: "", fat: "", carb: "" });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: () => {
      const body: FoodCreate = {
        name: f.name.trim(),
        brand: f.brand.trim() || null,
        kcal_100g: Number(f.kcal),
        protein_100g: Number(f.protein) || 0,
        fat_100g: Number(f.fat) || 0,
        carb_100g: Number(f.carb) || 0,
        portions: [],
      };
      return foods.createCustom(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.recent });
      qc.invalidateQueries({ queryKey: ["foods"] });
      toast("Custom food created — find it in Search", "ok");
      setF({ name: "", brand: "", kcal: "", protein: "", fat: "", carb: "" });
      onClose();
    },
    onError: () => toast("Could not create food", "error"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="New custom food">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Name">
          <Input required value={f.name} onChange={set("name")} placeholder="e.g. Homemade granola" autoFocus />
        </Field>
        <Field label="Brand (optional)">
          <Input value={f.brand} onChange={set("brand")} />
        </Field>
        <p className="label pt-1">Per 100 g</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label="kcal">
            <Input type="number" required min={0} value={f.kcal} onChange={set("kcal")} />
          </Field>
          <Field label="Protein">
            <Input type="number" min={0} value={f.protein} onChange={set("protein")} />
          </Field>
          <Field label="Fat">
            <Input type="number" min={0} value={f.fat} onChange={set("fat")} />
          </Field>
          <Field label="Carbs">
            <Input type="number" min={0} value={f.carb} onChange={set("carb")} />
          </Field>
        </div>
        <Button type="submit" full size="lg" loading={create.isPending} disabled={!f.name || !f.kcal}>
          Create food
        </Button>
      </form>
    </Dialog>
  );
}
