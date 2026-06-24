"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { weight as weightApi } from "@/lib/api/endpoints";
import { qk, useWeightSeries } from "@/lib/api/hooks";
import { dayLabel, fmtKg, fmtKgSigned, isoDate } from "@/lib/format";
import { Button, Card, CardTitle, EmptyState, Field, Input, Skeleton } from "@/components/ui/primitives";
import { TrendChart } from "@/components/ui/charts";
import { useToast } from "@/components/ui/toast";
import { Scale } from "lucide-react";

export default function WeightPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const series = useWeightSeries();
  const [date, setDate] = useState(isoDate());
  const [kg, setKg] = useState("");

  const log = useMutation({
    mutationFn: () => weightApi.log({ logged_on: date, weight_kg: Number(kg) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.weight });
      qc.invalidateQueries({ queryKey: qk.calibration });
      toast("Weight logged", "ok");
      setKg("");
    },
    onError: () => toast("Could not log weight", "error"),
  });

  const points = series.data?.points ?? [];
  const latest = points[points.length - 1];
  const change = points.length >= 2 ? latest.trend_kg - points[0].trend_kg : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Body weight</p>
        <h1 className="text-2xl font-semibold tracking-tight">Weight trend</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle right={latest && <span className="nums text-sm text-ink-muted">{fmtKg(latest.trend_kg)} trend</span>}>
            History
          </CardTitle>
          {series.isLoading ? (
            <Skeleton className="h-[200px]" />
          ) : points.length ? (
            <>
              <TrendChart points={points} />
              <div className="mt-3 flex items-center justify-center gap-6 text-xs text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" /> raw
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-brand-400" /> trend
                </span>
              </div>
            </>
          ) : (
            <EmptyState icon={<Scale className="h-7 w-7" />} title="No weigh-ins yet" hint="Log your morning weight to start the trend." />
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle>Log weight</CardTitle>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                log.mutate();
              }}
              className="space-y-4"
            >
              <Field label="Date">
                <Input type="date" value={date} max={isoDate()} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Weight (kg)" hint="Weigh first thing in the morning for the cleanest trend.">
                <Input type="number" step="0.1" min={30} required value={kg} onChange={(e) => setKg(e.target.value)} placeholder="e.g. 79.4" />
              </Field>
              <Button type="submit" full loading={log.isPending} disabled={!kg}>
                Save
              </Button>
            </form>
          </Card>

          {change !== null && (
            <Card>
              <CardTitle>Since start</CardTitle>
              <p className="nums text-3xl font-semibold">{fmtKgSigned(change)}</p>
              <p className="mt-1 text-xs text-ink-faint">by trend, over {points.length} days</p>
            </Card>
          )}
        </div>
      </div>

      {points.length > 0 && (
        <Card>
          <CardTitle>Recent entries</CardTitle>
          <ul className="divide-y divide-line">
            {[...points].reverse().slice(0, 10).map((p) => (
              <li key={p.logged_on} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink-muted">{dayLabel(p.logged_on)}</span>
                <span className="nums">
                  {fmtKg(p.weight_kg)} <span className="text-ink-faint">· {fmtKg(p.trend_kg)} trend</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
