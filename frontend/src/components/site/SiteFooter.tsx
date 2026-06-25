"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Rich public-site footer: brand line + product / legal / get-started columns.
 *  Shared by the landing and every legal page so the legal links are reachable
 *  from anywhere on the public site. */
export function SiteFooter() {
  const { t } = useTranslation();
  const year = "2026";

  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t("siteFooter.product"),
      links: [
        { href: "/try", label: t("siteFooter.tryCalculator") },
        { href: "/register", label: t("siteFooter.createAccount") },
        { href: "/login", label: t("siteFooter.logIn") },
      ],
    },
    {
      title: t("siteFooter.legal"),
      links: [
        { href: "/legal/privacy", label: t("siteFooter.privacy") },
        { href: "/legal/terms", label: t("siteFooter.terms") },
        { href: "/legal/cookies", label: t("siteFooter.cookies") },
        { href: "/legal/impressum", label: t("siteFooter.impressum") },
      ],
    },
  ];

  return (
    <footer className="border-t border-line bg-surface-2/40">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
                <Activity className="h-5 w-5 text-brand-400" />
              </div>
              <span className="text-lg font-semibold tracking-tight">VitaForge</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              {t("siteFooter.blurb")}
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="label mb-3">{c.title}</p>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-line pt-6 text-xs text-ink-faint sm:flex-row">
          <span>© {year} VitaForge. {t("siteFooter.rights")}</span>
          <span>{t("siteFooter.madeWith")}</span>
        </div>
      </div>
    </footer>
  );
}
