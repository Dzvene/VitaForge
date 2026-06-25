"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { AuthScaffold } from "@/components/AuthScaffold";

type State = "verifying" | "ok" | "error";

function VerifyInner() {
  const { t } = useTranslation();
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>(token ? "verifying" : "error");
  const [message, setMessage] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // StrictMode double-invoke guard — token is single-use.
    auth
      .verifyEmail(token)
      .then(() => setState("ok"))
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.detail : null);
      });
  }, [token]);

  if (state === "verifying") {
    return <p className="text-sm text-ink-muted">{t("auth.verifying")}</p>;
  }
  if (state === "ok") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-ok/10 p-4 text-sm text-ink">{t("auth.verifyOk")}</p>
        <Link href="/dashboard" className="block text-center text-sm font-medium text-brand-400 hover:text-brand-500">
          {t("auth.goToDashboard")}
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-warn/10 p-4 text-sm text-ink">{message ?? t("auth.verifyError")}</p>
      <Link href="/login" className="block text-center text-sm font-medium text-brand-400 hover:text-brand-500">
        {t("auth.backToLogin")}
      </Link>
    </div>
  );
}

function VerifyScaffold() {
  const { t } = useTranslation();
  return (
    <AuthScaffold title={t("auth.verifyTitle")} subtitle={t("auth.verifySubtitle")}>
      <VerifyInner />
    </AuthScaffold>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyScaffold />
    </Suspense>
  );
}
