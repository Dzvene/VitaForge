"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { auth, session, ApiError } from "@/lib/api";
import { Button, Input } from "@/components/primitives";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await auth.login(email, password);
      session.set(tokens.access_token);
      const me = await auth.me();
      if (me.role !== "admin") {
        session.clear();
        setError("This account is not an administrator.");
        setLoading(false);
        return;
      }
      router.replace("/");
    } catch (err) {
      session.clear();
      setError(err instanceof ApiError ? err.detail : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
            <Activity className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">VitaForge</p>
            <p className="text-xs text-ink-faint">Admin console</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-ink-muted">Administrator access only.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <span className="label block">Email</span>
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <span className="label block">Password</span>
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            {error && <span className="block text-xs text-danger">{error}</span>}
          </div>
          <Button type="submit" full loading={loading}>Sign in</Button>
        </form>
      </div>
    </div>
  );
}
