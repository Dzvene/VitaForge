"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { foods } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/hooks";
import type { FoodCreate } from "@/lib/api/types";
import { Button, Field, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function CustomFoodDialog({
  open,
  onClose,
  initialBarcode,
}: {
  open: boolean;
  onClose: () => void;
  initialBarcode?: string;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ name: "", brand: "", barcode: "", kcal: "", protein: "", fat: "", carb: "" });

  // Pre-fill barcode when dialog opens with a failed scan barcode.
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current && initialBarcode) {
      setF((s) => ({ ...s, barcode: initialBarcode }));
    }
    if (!open && prevOpen.current) {
      setF({ name: "", brand: "", barcode: "", kcal: "", protein: "", fat: "", carb: "" });
    }
    prevOpen.current = open;
  }, [open, initialBarcode]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: () => {
      const body: FoodCreate = {
        name: f.name.trim(),
        brand: f.brand.trim() || null,
        barcode: f.barcode.trim() || null,
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
      toast(t("diary.custom.created"), "ok");
      onClose();
    },
    onError: () => toast(t("diary.custom.createError"), "error"),
  });

  return (
    <Dialog open={open} onClose={onClose} title={t("diary.custom.title")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="space-y-4"
      >
        <Field label={t("diary.custom.name")}>
          <Input required value={f.name} onChange={set("name")} placeholder={t("diary.custom.namePlaceholder")} autoFocus />
        </Field>
        <Field label={t("diary.custom.brandOptional")}>
          <Input value={f.brand} onChange={set("brand")} />
        </Field>
        <Field label={t("diary.custom.barcodeOptional")}>
          <Input inputMode="numeric" value={f.barcode} onChange={set("barcode")} />
        </Field>
        <p className="label pt-1">{t("diary.custom.per100g")}</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label={t("common.kcal")}>
            <Input type="number" required min={0} value={f.kcal} onChange={set("kcal")} />
          </Field>
          <Field label={t("common.protein")}>
            <Input type="number" min={0} value={f.protein} onChange={set("protein")} />
          </Field>
          <Field label={t("common.fat")}>
            <Input type="number" min={0} value={f.fat} onChange={set("fat")} />
          </Field>
          <Field label={t("common.carbs")}>
            <Input type="number" min={0} value={f.carb} onChange={set("carb")} />
          </Field>
        </div>
        <Button type="submit" full size="lg" loading={create.isPending} disabled={!f.name || !f.kcal}>
          {t("diary.custom.createFood")}
        </Button>
      </form>
    </Dialog>
  );
}
