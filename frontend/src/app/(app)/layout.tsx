"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import { useProfile } from "@/lib/api/hooks";
import { AppShell } from "@/components/app-shell/AppShell";
import { Spinner } from "@/components/ui/primitives";

function FullSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { accessToken, hydrated } = useAuth();
  const profile = useProfile();

  // Auth gate.
  useEffect(() => {
    if (hydrated && !accessToken) router.replace("/login");
  }, [hydrated, accessToken, router]);

  // Profile gate — no profile yet means onboarding isn't done.
  useEffect(() => {
    if (profile.isError && profile.error instanceof ApiError && profile.error.status === 404) {
      router.replace("/onboarding");
    }
  }, [profile.isError, profile.error, router]);

  if (!hydrated || !accessToken) return <FullSpinner />;
  if (profile.isLoading) return <FullSpinner />;
  if (profile.isError) {
    if (profile.error instanceof ApiError && profile.error.status === 404) return <FullSpinner />;
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center text-sm text-ink-muted">
        {t("appShell.serverUnreachable")}
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
