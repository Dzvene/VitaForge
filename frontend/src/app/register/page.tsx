"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { AuthScaffold } from "@/components/AuthScaffold";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setTokens, setUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      await auth.register({ email, password, full_name: fullName || undefined });
      const tokens = await auth.login({ email, password });
      setTokens(tokens);
      const me = await auth.me();
      setUser(me);
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : t("error.generic"));
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title={t("auth.registerTitle")} subtitle={t("auth.registerSubtitle")}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("auth.name")}>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("auth.optional")} />
        </Field>
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
        <Field label={t("auth.password")} hint={t("auth.passwordHint")} error={error ?? undefined}>
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
          {t("auth.createAccount")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-400 hover:text-brand-500">
          {t("auth.logIn")}
        </Link>
      </p>
    </AuthScaffold>
  );
}
