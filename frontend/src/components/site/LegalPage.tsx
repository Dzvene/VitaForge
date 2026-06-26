"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LEGAL, type LegalContent, type LegalDoc } from "@/lib/legal";
import { legal as legalApi } from "@/lib/api/endpoints";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/primitives";
import { SiteFooter } from "@/components/site/SiteFooter";

function pickLocale(lang: string | undefined): "en" | "ru" | "de" {
  const p = (lang ?? "en").split("-")[0];
  return p === "ru" || p === "de" ? p : "en";
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t, i18n } = useTranslation();
  const locale = pickLocale(i18n.resolvedLanguage || i18n.language);

  // The bundled copy renders instantly (no fetch flash, crawlable); then we pull
  // the live version from the API — which carries any admin override — and swap
  // it in. On error we keep the bundled copy, so the page never goes blank.
  const [content, setContent] = useState<LegalContent>(LEGAL[locale][doc]);
  useEffect(() => {
    setContent(LEGAL[locale][doc]);
    let active = true;
    legalApi
      .get(doc)
      .then((c) => {
        if (active) {
          setContent({
            title: c.title,
            updated: c.updated,
            intro: c.intro ?? undefined,
            sections: c.sections,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [doc, locale]);

  const updated = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(content.updated),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
              <Activity className="h-5 w-5 text-brand-400" />
            </div>
            <span className="text-lg font-semibold tracking-tight">VitaForge</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/register" className="hidden sm:block">
              <Button size="sm">{t("landing.header.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Document */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {t("legal.backHome")}
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{content.title}</h1>
        <p className="mt-2 text-sm text-ink-faint">
          {t("legal.lastUpdated")}: {updated}
        </p>
        {content.intro && (
          <p className="mt-6 text-pretty leading-relaxed text-ink-muted">{content.intro}</p>
        )}

        <div className="mt-10 space-y-10">
          {content.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold tracking-tight text-ink">{s.heading}</h2>
              <div className="mt-3 space-y-3">
                {s.body.map((p, j) => (
                  <p key={j} className="text-pretty leading-relaxed text-ink-muted">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Cross-links to the other legal docs */}
        <nav className="mt-14 flex flex-wrap gap-2 border-t border-line pt-6">
          {(["privacy", "terms", "cookies", "impressum"] as LegalDoc[])
            .filter((d) => d !== doc)
            .map((d) => (
              <Link
                key={d}
                href={`/legal/${d}`}
                className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                {LEGAL[locale][d].title}
              </Link>
            ))}
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
