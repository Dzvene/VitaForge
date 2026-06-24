"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Info, Sparkles } from "lucide-react";
import { preview, type PreviewProfile } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { ACTIVITY_LABELS } from "@/lib/format";
import { fmtG, fmtKcal } from "@/lib/format";
import type { ActivityLevel, GoalKind, Sex, TargetOut } from "@/lib/api/types";
import { Button, Card, Field, Input, Segmented, Select } from "@/components/ui/primitives";

export default function TryPage() {
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
      setError(err instanceof ApiError ? err.detail : "Could not compute — check your inputs");
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
          <h1 className="text-xl font-semibold tracking-tight">Try it — no account needed</h1>
          <p className="text-sm text-ink-muted">
            Get a starting calorie &amp; macro target. Nothing is saved.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-6">
        <Field label="Sex">
          <Segmented
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Age">
            <Input type="number" min={14} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label="Height (cm)">
            <Input type="number" min={120} max={250} value={height} onChange={(e) => setHeight(e.target.value)} />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
        </div>

        <Field label="Activity level">
          <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
            {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Goal">
          <Segmented
            value={goal}
            onChange={setGoal}
            options={[
              { value: "lose", label: "Lose fat" },
              { value: "maintain", label: "Maintain" },
              { value: "gain", label: "Build" },
            ]}
          />
        </Field>

        {goal !== "maintain" && (
          <Field
            label={`Target rate (kg / week to ${goal === "lose" ? "lose" : "gain"})`}
            hint="A steep rate gets clamped to a healthy range automatically."
          >
            <Input type="number" step="0.05" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <Button type="submit" full size="lg" loading={loading}>
          Calculate my target
        </Button>
      </form>

      {result && (
        <Card className="mt-6 p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Calories" value={`${fmtKcal(result.target_calories)} kcal`} accent />
            <Metric label="Protein" value={fmtG(result.protein_g)} />
            <Metric label="Fat" value={fmtG(result.fat_g)} />
            <Metric label="Carbs" value={fmtG(result.carb_g)} />
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <p>
              This is a <span className="text-ink">formula estimate</span> — a starting guess from
              your stats ({fmtKcal(result.maintenance_kcal)} kcal maintenance). It&apos;s where most
              apps stop. Baseline keeps going: log a couple of weeks and it back-calculates your{" "}
              <span className="text-ink">real maintenance</span> from your weight trend, then builds
              the target from facts instead of a formula.
              {result.rate_clamped && (
                <>
                  {" "}
                  Your chosen rate was clamped to a safe range.
                </>
              )}
            </p>
          </div>

          <Link href="/register" className="mt-5 block">
            <Button full size="lg" variant="primary">
              <Sparkles className="h-4 w-4" />
              Create a free account to track it
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-2 text-center text-xs text-ink-muted">No ads. No paywall. Always free.</p>
        </Card>
      )}

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-400 hover:text-brand-500">
          Log in
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
