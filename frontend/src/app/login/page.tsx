"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { AuthScaffold } from "@/components/AuthScaffold";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuth();
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
      setError(err instanceof ApiError ? err.detail : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="Welcome back" subtitle="Log in to continue your plan.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" error={error ?? undefined}>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" full size="lg" loading={loading}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-brand-400 hover:text-brand-500">
          Create an account
        </Link>
      </p>
    </AuthScaffold>
  );
}
