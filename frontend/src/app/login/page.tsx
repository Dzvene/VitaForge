"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { useRedirectIfAuthed } from "@/lib/store/useRedirectIfAuthed";
import { AuthScaffold } from "@/components/AuthScaffold";
import { Button, Field, Input, Spinner } from "@/components/ui/primitives";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setTokens, setUser } = useAuth();
  const authed = useRedirectIfAuthed();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await auth.login({ email, password });
      setTokens(tokens);
      const me = await auth.me();
      setUser(me);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : t("error.generic"));
      setLoading(false);
    }
  };

  if (authed) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <AuthScaffold title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("auth.email")}>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label={t("auth.password")} error={error ?? undefined}>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-400 hover:text-brand-500"
          >
            {t("auth.forgotLink")}
          </Link>
        </div>
        <Button type="submit" full size="lg" loading={loading}>
          {t("auth.logIn")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("auth.newHere")}{" "}
        <Link href="/register" className="font-medium text-brand-400 hover:text-brand-500">
          {t("auth.createAccountLink")}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink-muted">
        {t("auth.justCurious")}{" "}
        <Link href="/try" className="font-medium text-brand-400 hover:text-brand-500">
          {t("auth.tryCalculator")}
        </Link>
      </p>
    </AuthScaffold>
  );
}
