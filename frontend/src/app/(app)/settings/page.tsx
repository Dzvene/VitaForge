"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { nutrition, profile as profileApi } from "@/lib/api/endpoints";
import { qk, useProfile, useTarget } from "@/lib/api/hooks";
import { ACTIVITY_LABELS } from "@/lib/format";
import type { ActivityLevel, GoalKind, ProfileUpsert, Sex } from "@/lib/api/types";
import { Button, Card, CardTitle, Field, Input, Segmented, Select, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/store/auth";

type ProteinMode = "per_kg" | "abs";

export default function SettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const profile = useProfile();
  const target = useTarget();

  const [form, setForm] = useState<ProfileUpsert | null>(null);
  const [proteinMode, setProteinMode] = useState<ProteinMode>("per_kg");

  useEffect(() => {
    if (profile.data && !form) {
      setForm({ ...profile.data });
      setProteinMode(profile.data.protein_g_abs != null ? "abs" : "per_kg");
    }
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (body: ProfileUpsert) => profileApi.upsert(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile });
      qc.invalidateQueries({ queryKey: qk.target });
      toast("Saved", "ok");
    },
    onError: () => toast("Could not save", "error"),
  });

  const recompute = useMutation({
    mutationFn: nutrition.recompute,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.target });
      toast("Norm recomputed", "ok");
    },
  });

  if (profile.isLoading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const set = <K extends keyof ProfileUpsert>(k: K, v: ProfileUpsert[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const onSave = () => {
    const body: ProfileUpsert = { ...form };
    if (proteinMode === "abs") body.protein_g_per_kg = null;
    else body.protein_g_abs = null;
    if (body.goal === "maintain") body.target_rate_kg_per_week = 0;
    save.mutate(body);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Account</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-faint">{user?.email}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Profile</CardTitle>
          <div className="space-y-4">
            <Field label="Sex">
              <Segmented
                value={form.sex}
                onChange={(v: Sex) => set("sex", v)}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ]}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Age">
                <Input type="number" value={form.age} onChange={(e) => set("age", Number(e.target.value))} />
              </Field>
              <Field label="Height (cm)">
                <Input type="number" value={form.height_cm} onChange={(e) => set("height_cm", Number(e.target.value))} />
              </Field>
              <Field label="Weight (kg)">
                <Input type="number" step="0.1" value={form.current_weight_kg} onChange={(e) => set("current_weight_kg", Number(e.target.value))} />
              </Field>
            </div>
            <Field label="Activity">
              <Select value={form.activity_level} onChange={(e) => set("activity_level", e.target.value as ActivityLevel)}>
                {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Goal</CardTitle>
          <div className="space-y-4">
            <Field label="Direction">
              <Segmented
                value={form.goal}
                onChange={(v: GoalKind) => set("goal", v)}
                options={[
                  { value: "lose", label: "Lose fat" },
                  { value: "maintain", label: "Maintain" },
                  { value: "gain", label: "Build" },
                ]}
              />
            </Field>
            {form.goal !== "maintain" && (
              <Field label="Rate (kg / week)" hint="Steep rates are clamped to a healthy maximum.">
                <Input
                  type="number"
                  step="0.05"
                  value={form.target_rate_kg_per_week}
                  onChange={(e) => set("target_rate_kg_per_week", Number(e.target.value))}
                />
              </Field>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Macros</CardTitle>
          <div className="space-y-4">
            <Field label="Protein target">
              <Segmented
                value={proteinMode}
                onChange={setProteinMode}
                options={[
                  { value: "per_kg", label: "g / kg" },
                  { value: "abs", label: "Absolute g" },
                ]}
              />
            </Field>
            {proteinMode === "per_kg" ? (
              <Field label="Protein (g / kg)" hint="Recommended 1.6–2.2 on a cut.">
                <Input
                  type="number"
                  step="0.1"
                  value={form.protein_g_per_kg ?? ""}
                  placeholder="default 1.8"
                  onChange={(e) => set("protein_g_per_kg", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            ) : (
              <Field label="Protein (g / day)">
                <Input
                  type="number"
                  value={form.protein_g_abs ?? ""}
                  placeholder="e.g. 180"
                  onChange={(e) => set("protein_g_abs", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            )}
            <Field label="Fat (g / kg)" hint="Floor is 0.8 g/kg.">
              <Input
                type="number"
                step="0.1"
                value={form.fat_g_per_kg ?? ""}
                placeholder="default 0.9"
                onChange={(e) => set("fat_g_per_kg", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>Current norm</CardTitle>
          {target.data ? (
            <div className="space-y-2 text-sm">
              <Line k="Target" v={`${Math.round(target.data.target_calories)} kcal`} />
              <Line k="Protein" v={`${Math.round(target.data.protein_g)} g`} />
              <Line k="Fat" v={`${Math.round(target.data.fat_g)} g`} />
              <Line k="Carbs" v={`${Math.round(target.data.carb_g)} g`} />
              <Line k="Basis" v={target.data.maintenance_source === "calibrated" ? "calibrated" : "formula"} />
            </div>
          ) : (
            <Skeleton className="h-24" />
          )}
          <Button variant="secondary" className="mt-4" full onClick={() => recompute.mutate()} loading={recompute.isPending}>
            Recompute norm
          </Button>
        </Card>
      </div>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <Button size="lg" onClick={onSave} loading={save.isPending} className="shadow-glow">
          Save changes
        </Button>
      </div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-muted">{k}</span>
      <span className="nums font-medium text-ink">{v}</span>
    </div>
  );
}
