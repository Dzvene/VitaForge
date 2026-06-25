"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { AuthScaffold } from "@/components/AuthScaffold";
import { Button, Field, Input } from "@/components/ui/primitives";

function ResetForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : t("error.generic"));
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-warn/10 p-4 text-sm text-ink">{t("auth.resetNoToken")}</p>
        <Link href="/forgot-password" className="block text-center text-sm font-medium text-brand-400 hover:text-brand-500">
          {t("auth.sendResetLink")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-ok/10 p-4 text-sm text-ink">{t("auth.resetDone")}</p>
        <Link href="/login" className="block text-center text-sm font-medium text-brand-400 hover:text-brand-500">
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t("auth.newPassword")} hint={t("auth.passwordHint")} error={error ?? undefined}>
        <Input
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </Field>
      <Button type="submit" full size="lg" loading={loading}>
        {t("auth.setNewPassword")}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetScaffold />
    </Suspense>
  );
}

function ResetScaffold() {
  const { t } = useTranslation();
  return (
    <AuthScaffold title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")}>
      <ResetForm />
    </AuthScaffold>
  );
}
