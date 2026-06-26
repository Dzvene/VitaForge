"use client";

import { useEffect, useState } from "react";
import { Apple, BookOpen, Database, Scale, ShieldCheck, UserCheck, Users } from "lucide-react";
import { admin, type AdminStats } from "@/lib/api";
import { Card, Spinner } from "@/components/primitives";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

export default function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    admin.stats().then(setStats).catch(() => setError(true));
  }, []);

  const cards = stats
    ? [
        { label: "Users", value: stats.users, icon: Users },
        { label: "Active users", value: stats.active_users, icon: UserCheck },
        { label: "Admins", value: stats.admins, icon: ShieldCheck },
        { label: "Foods in catalog", value: stats.foods, icon: Database },
        { label: "Custom foods", value: stats.custom_foods, icon: Apple },
        { label: "Diary entries", value: stats.diary_entries, icon: BookOpen },
        { label: "Weight logs", value: stats.weight_logs, icon: Scale },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Platform</p>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      </header>

      {error ? (
        <Card>
          <p className="text-sm text-danger">Couldn&apos;t load stats. Check the API connection.</p>
        </Card>
      ) : !stats ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.label}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">{c.label}</p>
                <c.icon className="h-4 w-4 text-brand-400" />
              </div>
              <p className="nums mt-2 text-3xl font-semibold tracking-tight">{fmt(c.value)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
