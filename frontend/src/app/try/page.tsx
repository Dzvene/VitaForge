"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Segmented } from "@/components/ui/primitives";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TargetDemo } from "@/components/try/TargetDemo";
import { TrendDemo } from "@/components/try/TrendDemo";
import { CalibrationDemo } from "@/components/try/CalibrationDemo";

type Tab = "target" | "trend" | "calibration";

export default function TryPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("target");

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
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <div className="mb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "target", label: t("try.tabTarget") },
            { value: "trend", label: t("try.tabTrend") },
            { value: "calibration", label: t("try.tabCalibration") },
          ]}
        />
        <p className="mt-2 text-sm text-ink-muted">
          {tab === "target" && t("try.tabTargetHint")}
          {tab === "trend" && t("try.tabTrendHint")}
          {tab === "calibration" && t("try.tabCalibrationHint")}
        </p>
      </div>

      {tab === "target" && <TargetDemo />}
      {tab === "trend" && <TrendDemo />}
      {tab === "calibration" && <CalibrationDemo />}

      <p className="mt-8 text-center text-sm text-ink-muted">
        {t("try.alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-400 hover:text-brand-500">
          {t("try.logIn")}
        </Link>
      </p>
    </div>
  );
}
