"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Activity, ArrowRight, Info, Sparkles } from "lucide-react";
import { preview, type PreviewProfile } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { fmtG, fmtKcal } from "@/lib/format";
import type { ActivityLevel, GoalKind, Sex, TargetOut } from "@/lib/api/types";
import { Button, Card, Field, Input, Segmented, Select } from "@/components/ui/primitives";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function TryPage() {
  const { t } = useTranslation();
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("30");
  const [height, setHeight] = useState("180");
  const [weight, setWeight] = useState("80");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<GoalKind>("lose");
  const [rate, setRate] = useState("0.5");

  const [result, setResult] = useState<TargetOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body: PreviewProfile = {
      sex,
      age: Number(age),
      height_cm: Number(height),
      current_weight_kg: Number(weight),
      activity_level: activity,
      goal,
      target_rate_kg_per_week: goal === "maintain" ? 0 : Number(rate),
    };
    try {
      setResult(await preview.nutrition(body));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : t("try.errorFallback"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-12">
      <div className="mb-7 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
          <Activity className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("try.title")}</h1>
          <p className="text-sm text-ink-muted">{t("try.subtitle")}</p>
        </div>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-6">
        <Field label={t("try.sexLabel")}>
          <Segmented
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: t("try.sexMale") },
              { value: "female", label: t("try.sexFemale") },
            ]}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label={t("try.ageLabel")}>
            <Input type="number" min={14} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label={t("try.heightLabel")}>
            <Input type="number" min={120} max={250} value={height} onChange={(e) => setHeight(e.target.value)} />
          </Field>
          <Field label={t("try.weightLabel")}>
            <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
        </div>

        <Field label={t("try.activityLabel")}>
          <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
            {["sedentary", "light", "moderate", "high", "very_high"].map((v) => (
              <option key={v} value={v}>
                {t("enums.activity." + v)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("try.goalLabel")}>
          <Segmented
            value={goal}
            onChange={setGoal}
            options={[
              { value: "lose", label: t("try.goalLose") },
              { value: "maintain", label: t("try.goalMaintain") },
              { value: "gain", label: t("try.goalGain") },
            ]}
          />
        </Field>

        {goal !== "maintain" && (
          <Field
            label={goal === "lose" ? t("try.rateLabelLose") : t("try.rateLabelGain")}
            hint={t("try.rateHint")}
          >
            <Input type="number" step="0.05" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <Button type="submit" full size="lg" loading={loading}>
          {t("try.calculate")}
        </Button>
      </form>

      {result && (
        <Card className="mt-6 p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label={t("common.calories")} value={`${fmtKcal(result.target_calories)} ${t("common.kcal")}`} accent />
            <Metric label={t("common.protein")} value={fmtG(result.protein_g, t("common.grams"))} />
            <Metric label={t("common.fat")} value={fmtG(result.fat_g, t("common.grams"))} />
            <Metric label={t("common.carbs")} value={fmtG(result.carb_g, t("common.grams"))} />
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <p>
              {t("try.explainBefore")}{" "}
              <span className="text-ink">{t("try.explainFormulaEstimate")}</span>{" "}
              {t("try.explainMiddle", { maintenance: fmtKcal(result.maintenance_kcal) })}{" "}
              <span className="text-ink">{t("try.explainRealMaintenance")}</span>{" "}
              {t("try.explainAfter")}
              {result.rate_clamped && <> {t("try.rateClampedNote")}</>}
            </p>
          </div>

          <Link href="/register" className="mt-5 block">
            <Button full size="lg" variant="primary">
              <Sparkles className="h-4 w-4" />
              {t("try.createAccountCta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-2 text-center text-xs text-ink-muted">{t("try.freeNote")}</p>
        </Card>
      )}

      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("try.alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-400 hover:text-brand-500">
          {t("try.logIn")}
        </Link>
      </p>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent ? "text-brand-400" : "text-ink"}`}>{value}</p>
    </div>
  );
}
