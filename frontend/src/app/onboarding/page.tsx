"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { profile as profileApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import type { ActivityLevel, GoalKind, ProfileUpsert, Sex } from "@/lib/api/types";
import { Button, Field, Input, Segmented, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "high", "very_high"];

export default function OnboardingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { accessToken, hydrated } = useAuth();

  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("30");
  const [height, setHeight] = useState("180");
  const [weight, setWeight] = useState("80");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<GoalKind>("lose");
  const [rate, setRate] = useState("0.5");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/login");
  }, [hydrated, accessToken, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const body: ProfileUpsert = {
      sex,
      age: Number(age),
      height_cm: Number(height),
      current_weight_kg: Number(weight),
      activity_level: activity,
      goal,
      target_rate_kg_per_week: goal === "maintain" ? 0 : Number(rate),
    };
    try {
      await profileApi.upsert(body);
      toast(t("onboarding.savedToast"), "ok");
      router.replace("/dashboard");
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : t("onboarding.saveError"), "error");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-10">
      <div className="mb-7 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
          <Activity className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("onboarding.title")}</h1>
          <p className="text-sm text-ink-muted">{t("onboarding.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-6">
        <Field label={t("onboarding.sex")}>
          <Segmented
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: t("onboarding.male") },
              { value: "female", label: t("onboarding.female") },
            ]}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label={t("onboarding.age")}>
            <Input type="number" min={14} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label={t("onboarding.heightCm")}>
            <Input type="number" min={120} max={250} value={height} onChange={(e) => setHeight(e.target.value)} />
          </Field>
          <Field label={t("onboarding.weightKg")}>
            <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
        </div>

        <Field label={t("onboarding.activityLevel")}>
          <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
            {ACTIVITY_LEVELS.map((v) => (
              <option key={v} value={v}>
                {t("enums.activity." + v)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("onboarding.goal")}>
          <Segmented
            value={goal}
            onChange={setGoal}
            options={[
              { value: "lose", label: t("enums.goal.lose") },
              { value: "maintain", label: t("enums.goal.maintain") },
              { value: "gain", label: t("enums.goal.gain") },
            ]}
          />
        </Field>

        {goal !== "maintain" && (
          <Field
            label={goal === "lose" ? t("onboarding.targetRateLose") : t("onboarding.targetRateGain")}
            hint={t("onboarding.targetRateHint")}
          >
            <Input type="number" step="0.05" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        )}

        <div className="flex items-start gap-2.5 rounded-xl bg-surface-2 p-3.5 text-sm text-ink-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          <p>{t("onboarding.calibrationNote")}</p>
        </div>

        <Button type="submit" full size="lg" loading={loading}>
          {t("onboarding.startCalibration")} <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
