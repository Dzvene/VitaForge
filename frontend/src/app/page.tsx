"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Calculator,
  Gauge,
  LineChart,
  MessageSquare,
  ScanBarcode,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { Button } from "@/components/ui/primitives";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const { accessToken, hydrated } = useAuth();

  // Signed-in visitors go straight to their dashboard; everyone else sees the
  // landing instead of being bounced to a bare login form.
  useEffect(() => {
    if (hydrated && accessToken) router.replace("/dashboard");
  }, [accessToken, hydrated, router]);

  if (hydrated && accessToken) return null;

  return (
    <div className="min-h-dvh">
      {/* Top bar */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
            <Activity className="h-5 w-5 text-brand-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight">VitaForge</span>
        </div>
        <nav className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t("landing.header.login")}
            </Button>
          </Link>
          <Link href="/register" className="hidden sm:block">
            <Button size="sm">{t("landing.header.getStarted")}</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-8 pt-12 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-ink-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          {t("landing.hero.badge")}
        </span>
        <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          {t("landing.hero.titleLead")}{" "}
          <span className="text-brand-400">{t("landing.hero.titleHighlight")}</span>{" "}
          {t("landing.hero.titleTail")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
          {t("landing.hero.subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/try" className="w-full sm:w-auto">
            <Button size="lg" full className="sm:w-auto sm:px-8">
              <Calculator className="h-4 w-4" />
              {t("landing.hero.tryCta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" full className="sm:w-auto sm:px-8">
              {t("landing.hero.registerCta")}
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-faint">{t("landing.hero.noStrings")}</p>
      </section>

      {/* How it's different — the method */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          {t("landing.method.title")}
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Step
            n={1}
            icon={<Calculator className="h-5 w-5 text-brand-400" />}
            title={t("landing.method.step1Title")}
            body={t("landing.method.step1Body")}
          />
          <Step
            n={2}
            icon={<TrendingDown className="h-5 w-5 text-brand-400" />}
            title={t("landing.method.step2Title")}
            body={t("landing.method.step2Body")}
          />
          <Step
            n={3}
            icon={<Gauge className="h-5 w-5 text-brand-400" />}
            title={t("landing.method.step3Title")}
            body={t("landing.method.step3Body")}
          />
        </div>
      </section>

      {/* Verifiable facts */}
      <section className="mx-auto max-w-5xl px-5 pb-6">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          <Fact value={t("landing.facts.foodsValue")} label={t("landing.facts.foodsLabel")} />
          <Fact value={t("landing.facts.priceValue")} label={t("landing.facts.priceLabel")} />
          <Fact value={t("landing.facts.methodValue")} label={t("landing.facts.methodLabel")} />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          <Feature
            icon={<ScanBarcode className="h-5 w-5 text-brand-400" />}
            title={t("landing.features.diaryTitle")}
            body={t("landing.features.diaryBody")}
          />
          <Feature
            icon={<LineChart className="h-5 w-5 text-brand-400" />}
            title={t("landing.features.trendTitle")}
            body={t("landing.features.trendBody")}
          />
          <Feature
            icon={<Gauge className="h-5 w-5 text-brand-400" />}
            title={t("landing.features.calibrationTitle")}
            body={t("landing.features.calibrationBody")}
          />
          <Feature
            icon={<MessageSquare className="h-5 w-5 text-brand-400" />}
            title={t("landing.features.coachingTitle")}
            body={t("landing.features.coachingBody")}
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <div className="card flex flex-col items-center gap-5 p-8 text-center sm:p-10">
          <BookOpen className="h-6 w-6 text-brand-400" />
          <h2 className="text-2xl font-semibold tracking-tight">{t("landing.cta.title")}</h2>
          <p className="max-w-md text-ink-muted">{t("landing.cta.body")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/try">
              <Button size="lg" className="px-8">
                <Calculator className="h-4 w-4" />
                {t("landing.cta.tryCta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="px-8">
                {t("landing.cta.registerCta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card relative p-6">
      <span className="absolute right-5 top-5 text-sm font-semibold text-ink-faint">0{n}</span>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-surface-2 p-6 text-center">
      <p className="text-2xl font-semibold tracking-tight text-brand-400">{value}</p>
      <p className="mt-1.5 text-sm text-ink-muted">{label}</p>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card flex gap-4 p-6">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
      </div>
    </div>
  );
}
