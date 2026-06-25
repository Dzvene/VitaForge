"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MailWarning, X } from "lucide-react";
import { auth } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/store/auth";

const DISMISS_KEY = "vf_verify_dismissed";

/**
 * Slim banner shown across the top of the app while the signed-in user's email
 * is unverified. Gives them the one in-app action the feature needs — resend —
 * which otherwise only existed behind an emailed link. Dismissable for the
 * session (sessionStorage), so it nudges without nagging on every navigation.
 */
export function VerifyEmailBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  // Read sessionStorage after mount to avoid an SSR/client hydration mismatch.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
  }, []);

  if (!user || user.email_verified || dismissed) return null;

  const resend = async () => {
    setSending(true);
    try {
      await auth.resendVerification();
    } catch {
      // Best-effort: the endpoint never reveals state; show the same confirmation.
    } finally {
      setSent(true);
      setSending(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 border-b border-warn/30 bg-warn/10 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
      <MailWarning className="h-4 w-4 shrink-0 text-warn" />
      <p className="min-w-0 flex-1 text-ink-muted">
        {sent ? t("appShell.verifyResent") : t("appShell.verifyBannerText")}
      </p>
      {!sent && (
        <button
          onClick={resend}
          disabled={sending}
          className="shrink-0 font-medium text-brand-400 hover:text-brand-500 disabled:opacity-50"
        >
          {t("appShell.verifyResend")}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label={t("common.dismiss")}
        className="shrink-0 rounded p-1 text-ink-faint hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
