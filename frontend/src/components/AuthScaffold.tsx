"use client";

import { Activity, Check } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function AuthScaffold({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const POINTS = [t("auth.point1"), t("auth.point2"), t("auth.point3")];
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line p-10 lg:flex">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(700px_400px_at_20%_-10%,rgba(61,123,255,0.18),transparent_60%)]" />
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
            <Activity className="h-5 w-5 text-brand-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{t("auth.brand")}</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            {t("auth.heroLead")}
            <span className="text-brand-400"> {t("auth.heroHighlight")}</span>
          </h1>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-ink-muted">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok/15">
                  <Check className="h-3 w-3 text-ok" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-faint">{t("auth.heroFootnote")}</p>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center p-6">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-7">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
