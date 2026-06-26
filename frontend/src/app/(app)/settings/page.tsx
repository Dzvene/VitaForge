"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { account, auth, nutrition, profile as profileApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { qk, useProfile, useTarget } from "@/lib/api/hooks";
import type { ActivityLevel, GoalKind, ProfileUpsert, Sex } from "@/lib/api/types";
import { Button, Card, CardTitle, Field, Input, Segmented, Select, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSegmented } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/store/auth";

const ACTIVITY_KEYS: ActivityLevel[] = ["sedentary", "light", "moderate", "high", "very_high"];

type ProteinMode = "per_kg" | "abs";

export default function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const { user, clear } = useAuth();
  const profile = useProfile();
  const target = useTarget();

  const [form, setForm] = useState<ProfileUpsert | null>(null);
  const [proteinMode, setProteinMode] = useState<ProteinMode>("per_kg");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const exportData = useMutation({
    mutationFn: account.exportData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vitaforge-export.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast(t("settings.exportError"), "error"),
  });

  const deleteAccount = useMutation({
    mutationFn: () => account.deleteAccount(deletePassword),
    onSuccess: () => {
      clear();
      router.replace("/login");
    },
    onError: () => toast(t("settings.deleteError"), "error"),
  });

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
      toast(t("settings.toastSaved"), "ok");
    },
    onError: () => toast(t("settings.toastSaveError"), "error"),
  });

  const recompute = useMutation({
    mutationFn: nutrition.recompute,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.target });
      toast(t("settings.toastRecomputed"), "ok");
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
        <p className="label">{t("settings.accountLabel")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-ink-faint">{user?.email}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("settings.languageTitle")}</CardTitle>
          <p className="mb-4 text-sm text-ink-muted">{t("settings.languageHint")}</p>
          <LanguageSwitcher variant="segmented" />
        </Card>
        <Card>
          <CardTitle>{t("settings.themeTitle")}</CardTitle>
          <p className="mb-4 text-sm text-ink-muted">{t("settings.themeHint")}</p>
          <ThemeSegmented />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("settings.profileTitle")}</CardTitle>
          <div className="space-y-4">
            <Field label={t("settings.sex")}>
              <Segmented
                value={form.sex}
                onChange={(v: Sex) => set("sex", v)}
                options={[
                  { value: "male", label: t("settings.sexMale") },
                  { value: "female", label: t("settings.sexFemale") },
                ]}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("settings.age")}>
                <Input type="number" value={form.age} onChange={(e) => set("age", Number(e.target.value))} />
              </Field>
              <Field label={t("settings.heightCm")}>
                <Input type="number" value={form.height_cm} onChange={(e) => set("height_cm", Number(e.target.value))} />
              </Field>
              <Field label={t("settings.weightKg")}>
                <Input type="number" step="0.1" value={form.current_weight_kg} onChange={(e) => set("current_weight_kg", Number(e.target.value))} />
              </Field>
            </div>
            <Field label={t("settings.activity")}>
              <Select value={form.activity_level} onChange={(e) => set("activity_level", e.target.value as ActivityLevel)}>
                {ACTIVITY_KEYS.map((v) => (
                  <option key={v} value={v}>
                    {t("enums.activity." + v)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>{t("settings.goalTitle")}</CardTitle>
          <div className="space-y-4">
            <Field label={t("settings.direction")}>
              <Segmented
                value={form.goal}
                onChange={(v: GoalKind) => set("goal", v)}
                options={[
                  { value: "lose", label: t("enums.goal.lose") },
                  { value: "maintain", label: t("enums.goal.maintain") },
                  { value: "gain", label: t("enums.goal.gain") },
                ]}
              />
            </Field>
            {form.goal !== "maintain" && (
              <Field label={t("settings.rateKgPerWeek")} hint={t("settings.rateHint")}>
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
          <CardTitle>{t("settings.macrosTitle")}</CardTitle>
          <div className="space-y-4">
            <Field label={t("settings.proteinTarget")}>
              <Segmented
                value={proteinMode}
                onChange={setProteinMode}
                options={[
                  { value: "per_kg", label: t("settings.proteinPerKg") },
                  { value: "abs", label: t("settings.proteinAbsolute") },
                ]}
              />
            </Field>
            {proteinMode === "per_kg" ? (
              <Field label={t("settings.proteinGPerKg")} hint={t("settings.proteinPerKgHint")}>
                <Input
                  type="number"
                  step="0.1"
                  value={form.protein_g_per_kg ?? ""}
                  placeholder={t("settings.proteinPerKgPlaceholder")}
                  onChange={(e) => set("protein_g_per_kg", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            ) : (
              <Field label={t("settings.proteinGPerDay")}>
                <Input
                  type="number"
                  value={form.protein_g_abs ?? ""}
                  placeholder={t("settings.proteinAbsPlaceholder")}
                  onChange={(e) => set("protein_g_abs", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            )}
            <Field label={t("settings.fatGPerKg")} hint={t("settings.fatHint")}>
              <Input
                type="number"
                step="0.1"
                value={form.fat_g_per_kg ?? ""}
                placeholder={t("settings.fatPlaceholder")}
                onChange={(e) => set("fat_g_per_kg", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>{t("settings.currentNormTitle")}</CardTitle>
          {target.data ? (
            <div className="space-y-2 text-sm">
              <Line k={t("settings.normTarget")} v={`${Math.round(target.data.target_calories)} ${t("common.kcal")}`} />
              <Line k={t("settings.normProtein")} v={`${Math.round(target.data.protein_g)} ${t("settings.gramSuffix")}`} />
              <Line k={t("settings.normFat")} v={`${Math.round(target.data.fat_g)} ${t("settings.gramSuffix")}`} />
              <Line k={t("settings.normCarbs")} v={`${Math.round(target.data.carb_g)} ${t("settings.gramSuffix")}`} />
              <Line k={t("settings.normBasis")} v={target.data.maintenance_source === "calibrated" ? t("settings.basisCalibrated") : t("settings.basisFormula")} />
            </div>
          ) : (
            <Skeleton className="h-24" />
          )}
          <Button variant="secondary" className="mt-4" full onClick={() => recompute.mutate()} loading={recompute.isPending}>
            {t("settings.recomputeNorm")}
          </Button>
        </Card>
      </div>

      <ChangePasswordCard />

      <Card>
        <CardTitle>{t("settings.dataTitle")}</CardTitle>
        <p className="mb-4 text-sm text-ink-muted">{t("settings.dataHint")}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            onClick={() => exportData.mutate()}
            loading={exportData.isPending}
          >
            {t("settings.exportBtn")}
          </Button>
          {!confirmingDelete ? (
            <Button variant="ghost" className="text-danger" onClick={() => setConfirmingDelete(true)}>
              {t("settings.deleteBtn")}
            </Button>
          ) : null}
        </div>

        {confirmingDelete && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/5 p-4">
            <p className="text-sm font-medium text-ink">{t("settings.deleteConfirmTitle")}</p>
            <p className="mt-1 text-sm text-ink-muted">{t("settings.deleteConfirmHint")}</p>
            <div className="mt-3">
              <Field label={t("settings.deletePasswordLabel")}>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeletePassword("");
                }}
              >
                {t("settings.deleteCancel")}
              </Button>
              <Button
                className="bg-danger text-white hover:bg-danger/90"
                disabled={!deletePassword}
                loading={deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
              >
                {t("settings.deleteConfirmBtn")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Solid sticky footer bar (not a floating pill) so it can't transparently
          overlap card buttons like "Recompute norm". Bleeds to the main padding
          edges; sits above the mobile bottom-nav. */}
      <div className="sticky bottom-20 z-10 -mx-4 mt-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:bottom-0 lg:-mx-8 lg:px-8">
        <div className="flex justify-end">
          <Button size="lg" onClick={onSave} loading={save.isPending} className="shadow-glow">
            {t("settings.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: () => auth.changePassword(current, next),
    onSuccess: () => {
      toast(t("settings.security.toastChanged"), "ok");
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.detail : t("settings.security.changeError")),
  });

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= 8 && next === confirm && !change.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tooShort) return setError(t("settings.security.tooShort"));
    if (next !== confirm) return setError(t("settings.security.mismatch"));
    change.mutate();
  };

  return (
    <Card>
      <CardTitle>{t("settings.security.title")}</CardTitle>
      <p className="mb-4 text-sm text-ink-muted">{t("settings.security.hint")}</p>
      <form onSubmit={onSubmit} className="grid max-w-md gap-4">
        <Field label={t("settings.security.currentLabel")}>
          <Input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field
          label={t("settings.security.newLabel")}
          hint={t("settings.security.newHint")}
          error={tooShort ? t("settings.security.tooShort") : undefined}
        >
          <Input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field
          label={t("settings.security.confirmLabel")}
          error={mismatch ? t("settings.security.mismatch") : (error ?? undefined)}
        >
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <div>
          <Button type="submit" disabled={!canSubmit} loading={change.isPending}>
            {t("settings.security.submit")}
          </Button>
        </div>
      </form>
    </Card>
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
