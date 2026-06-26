"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { admin, ApiError, type ParamsView } from "@/lib/api";
import { Badge, Button, Card, Input, Spinner } from "@/components/primitives";

export default function ParamsPage() {
  const [data, setData] = useState<ParamsView | null>(null);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = () => {
    admin
      .getParams()
      .then((d) => {
        setData(d);
        const numeric: Record<string, number> = {};
        for (const [k, v] of Object.entries(d.effective)) {
          if (typeof v === "number") numeric[k] = v;
        }
        setDraft(numeric);
      })
      .catch(() => setError(true));
  };

  useEffect(load, []);

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2500);
  };

  const save = async () => {
    setBusy(true);
    try {
      const updated = await admin.setParams(draft);
      setData(updated);
      flash("Parameters saved");
    } catch (e) {
      flash(e instanceof ApiError ? e.detail : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const overrideKeys = new Set(Object.keys(data?.overrides ?? {}));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Engine</p>
          <h1 className="text-2xl font-semibold tracking-tight">Parameters</h1>
        </div>
        {note && <p className="text-sm text-ink-muted">{note}</p>}
      </header>

      {error ? (
        <Card>
          <p className="text-sm text-danger">Couldn&apos;t load parameters.</p>
        </Card>
      ) : !data ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <Card>
          <div className="mb-5 flex items-start justify-between gap-3">
            <p className="text-sm text-ink-muted">
              App-wide defaults for the calibration &amp; nutrition engine. Per-user overrides still
              take precedence. Edit a value to override it for everyone; an{" "}
              <span className="text-brand-400">overridden</span> badge marks what differs from the
              built-in default.
            </p>
            <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(draft).map(([k, val]) => (
              <label key={k} className="block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-medium text-ink-muted">
                  {k.replace(/_/g, " ")}
                  {overrideKeys.has(k) && <Badge tone="brand">overridden</Badge>}
                </span>
                <Input
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => setDraft((d) => ({ ...d, [k]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={save} loading={busy}>
              Save parameters
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
