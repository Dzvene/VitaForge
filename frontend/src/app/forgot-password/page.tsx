"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { AuthScaffold } from "@/components/AuthScaffold";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Always succeeds server-side (no account enumeration); we show the same
      // confirmation regardless of whether the address is registered.
      await auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : t("error.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")}>
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-ok/10 p-4 text-sm text-ink">{t("auth.forgotSent")}</p>
          <Link href="/login" className="block text-center text-sm font-medium text-brand-400 hover:text-brand-500">
            {t("auth.backToLogin")}
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="space-y-4">
            <Field label={t("auth.email")} error={error ?? undefined}>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Button type="submit" full size="lg" loading={loading}>
              {t("auth.sendResetLink")}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-muted">
            <Link href="/login" className="font-medium text-brand-400 hover:text-brand-500">
              {t("auth.backToLogin")}
            </Link>
          </p>
        </>
      )}
    </AuthScaffold>
  );
}
