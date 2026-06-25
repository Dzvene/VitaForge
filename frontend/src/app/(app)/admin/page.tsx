"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  if (user && user.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="label">{t("admin.owner")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin.title")}</h1>
      </header>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: t("admin.tabs.overview") },
          { value: "users", label: t("admin.tabs.users") },
          { value: "foods", label: t("admin.tabs.foods") },
          { value: "params", label: t("admin.tabs.params") },
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
  const { t } = useTranslation();
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: admin.stats });
  if (stats.isLoading || !stats.data) return <Skeleton className="h-32" />;
  const s = stats.data;
  const cells: { label: string; value: number; icon: typeof Users }[] = [
    { label: t("admin.overview.users"), value: s.users, icon: Users },
    { label: t("admin.overview.active"), value: s.active_users, icon: Activity },
    { label: t("admin.overview.admins"), value: s.admins, icon: Users },
    { label: t("admin.overview.foods"), value: s.foods, icon: Database },
    { label: t("admin.overview.customFoods"), value: s.custom_foods, icon: Apple },
    { label: t("admin.overview.diaryEntries"), value: s.diary_entries, icon: Apple },
    { label: t("admin.overview.weighIns"), value: s.weight_logs, icon: Activity },
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
  const { t } = useTranslation();
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
      toast(t("admin.params.saved"), "ok");
    },
    onError: () => toast(t("admin.params.saveFailed"), "error"),
  });

  if (params.isLoading) return <Skeleton className="h-64" />;

  const overrideKeys = new Set(Object.keys(params.data?.overrides ?? {}));

  return (
    <Card>
      <CardTitle right={<SlidersHorizontal className="h-4 w-4 text-brand-400" />}>{t("admin.params.title")}</CardTitle>
      <p className="mb-5 text-sm text-ink-muted">
        {t("admin.params.subtitle")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(draft).map(([k, v]) => (
          <Field key={k} label={k.replace(/_/g, " ")} hint={overrideKeys.has(k) ? t("admin.params.overridden") : undefined}>
            <Input type="number" step="any" value={v} onChange={(e) => setDraft((d) => ({ ...d, [k]: Number(e.target.value) }))} />
          </Field>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          {t("admin.params.saveButton")}
        </Button>
      </div>
    </Card>
  );
}
