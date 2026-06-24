"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function Home() {
  const router = useRouter();
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
          <span className="text-lg font-semibold tracking-tight">Baseline</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register" className="hidden sm:block">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-8 pt-12 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-ink-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          Calibration-first · free forever
        </span>
        <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Stop guessing your calories. <span className="text-brand-400">Measure</span> them.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
          Every other tracker hands you a formula and hopes for the best. Baseline logs your
          food and weight, then back-calculates your{" "}
          <span className="text-ink">real maintenance</span> from the trend — so your target is
          built from facts, not a guess.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/try" className="w-full sm:w-auto">
            <Button size="lg" full className="sm:w-auto sm:px-8">
              <Calculator className="h-4 w-4" />
              Try it — no account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" full className="sm:w-auto sm:px-8">
              Create a free account
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-faint">No ads. No paywall. No credit card.</p>
      </section>

      {/* How it's different — the method */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Most apps guess. Baseline measures.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Step
            n={1}
            icon={<Calculator className="h-5 w-5 text-brand-400" />}
            title="Start with an estimate"
            body="Enter your stats and get a starting calorie & macro target from the standard formula — the same one most apps stop at."
          />
          <Step
            n={2}
            icon={<TrendingDown className="h-5 w-5 text-brand-400" />}
            title="Log a couple of weeks"
            body="Track what you eat and step on the scale. Day-to-day noise is smoothed into a real weight trend, not a single jumpy number."
          />
          <Step
            n={3}
            icon={<Gauge className="h-5 w-5 text-brand-400" />}
            title="Get your real maintenance"
            body="Baseline reads your actual intake against the trend and back-calculates the calories that truly hold your weight — then builds the goal from that."
          />
        </div>
      </section>

      {/* Verifiable facts */}
      <section className="mx-auto max-w-5xl px-5 pb-6">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          <Fact value="450,000+" label="foods with barcode lookup, from USDA FoodData Central" />
          <Fact value="€0" label="free forever — no ads, no subscription, no upsell" />
          <Fact value="Every number" label="explained — Baseline shows the method, never a black box" />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          <Feature
            icon={<ScanBarcode className="h-5 w-5 text-brand-400" />}
            title="Food diary with barcode search"
            body="Search a real catalog of hundreds of thousands of foods, scan a barcode, save favourites, copy a whole day forward."
          />
          <Feature
            icon={<LineChart className="h-5 w-5 text-brand-400" />}
            title="Weight trend that ignores noise"
            body="An exponential moving average turns the daily scale chaos into a clean line you can actually act on."
          />
          <Feature
            icon={<Gauge className="h-5 w-5 text-brand-400" />}
            title="Calibration engine"
            body="The core of the product: your maintenance is measured from your own data and re-checked as you go, with a safe rate of change built in."
          />
          <Feature
            icon={<MessageSquare className="h-5 w-5 text-brand-400" />}
            title="Coaching that steers, not shames"
            body="In-day guidance on hitting your protein and staying on target — and no blame after an overage, just the next right step."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <div className="card flex flex-col items-center gap-5 p-8 text-center sm:p-10">
          <BookOpen className="h-6 w-6 text-brand-400" />
          <h2 className="text-2xl font-semibold tracking-tight">
            See your number in under a minute
          </h2>
          <p className="max-w-md text-ink-muted">
            No sign-up to try. Run the calculator, then create a free account if you want
            Baseline to start measuring your real maintenance.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/try">
              <Button size="lg" className="px-8">
                <Calculator className="h-4 w-4" />
                Try the calculator
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="px-8">
                Create a free account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-ink-faint sm:flex-row">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-400" />
            <span>Baseline — calibration-first nutrition tracking</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/try" className="hover:text-ink">
              Try it
            </Link>
            <Link href="/login" className="hover:text-ink">
              Log in
            </Link>
            <Link href="/register" className="hover:text-ink">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
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
