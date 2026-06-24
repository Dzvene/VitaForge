"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Apple, Database, SlidersHorizontal, Users } from "lucide-react";
import { admin } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/store/auth";
import { Button, Card, CardTitle, Field, Input, Segmented, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { UsersPanel } from "./UsersPanel";
import { FoodsPanel } from "./FoodsPanel";

type Tab = "overview" | "users" | "foods" | "params";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  if (user && user.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Owner</p>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      </header>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Overview" },
          { value: "users", label: "Users" },
          { value: "foods", label: "Foods" },
          { value: "params", label: "Parameters" },
        ]}
      />

      {tab === "overview" && <Overview />}
      {tab === "users" && <UsersPanel />}
      {tab === "foods" && <FoodsPanel />}
      {tab === "params" && <ParamsPanel />}
    </div>
  );
}

function Overview() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: admin.stats });
  if (stats.isLoading || !stats.data) return <Skeleton className="h-32" />;
  const s = stats.data;
  const cells: { label: string; value: number; icon: typeof Users }[] = [
    { label: "Users", value: s.users, icon: Users },
    { label: "Active", value: s.active_users, icon: Activity },
    { label: "Admins", value: s.admins, icon: Users },
    { label: "Foods", value: s.foods, icon: Database },
    { label: "Custom foods", value: s.custom_foods, icon: Apple },
    { label: "Diary entries", value: s.diary_entries, icon: Apple },
    { label: "Weigh-ins", value: s.weight_logs, icon: Activity },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {cells.map((c) => (
        <Card key={c.label}>
          <c.icon className="h-4 w-4 text-brand-400" />
          <p className="nums mt-3 text-3xl font-semibold">{c.value}</p>
          <p className="mt-1 text-xs text-ink-faint">{c.label}</p>
        </Card>
      ))}
    </div>
  );
}

function ParamsPanel() {
  const qc = useQueryClient();
  const toast = useToast();
  const params = useQuery({ queryKey: ["admin", "params"], queryFn: admin.getParams });
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    if (params.data) {
      const numeric: Record<string, number> = {};
      for (const [k, v] of Object.entries(params.data.effective)) {
        if (typeof v === "number") numeric[k] = v;
      }
      setDraft(numeric);
    }
  }, [params.data]);

  const save = useMutation({
    mutationFn: () => admin.setParams(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "params"] });
      toast("Parameters saved", "ok");
    },
    onError: () => toast("Save failed", "error"),
  });

  if (params.isLoading) return <Skeleton className="h-64" />;

  const overrideKeys = new Set(Object.keys(params.data?.overrides ?? {}));

  return (
    <Card>
      <CardTitle right={<SlidersHorizontal className="h-4 w-4 text-brand-400" />}>App-level parameters (§6)</CardTitle>
      <p className="mb-5 text-sm text-ink-muted">
        Defaults for everyone. Per-user overrides still take precedence. Edit a value to override it app-wide.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(draft).map(([k, v]) => (
          <Field key={k} label={k.replace(/_/g, " ")} hint={overrideKeys.has(k) ? "overridden" : undefined}>
            <Input type="number" step="any" value={v} onChange={(e) => setDraft((d) => ({ ...d, [k]: Number(e.target.value) }))} />
          </Field>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Save parameters
        </Button>
      </div>
    </Card>
  );
}
