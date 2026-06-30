"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChefHat,
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  Shield,
  Sliders,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { cn } from "@/lib/cn";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerifyEmailBanner } from "@/components/app-shell/VerifyEmailBanner";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  admin?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.today", icon: LayoutDashboard },
  { href: "/diary", labelKey: "nav.diary", icon: BookOpen },
  { href: "/recipes", labelKey: "nav.recipes", icon: ChefHat },
  { href: "/weight", labelKey: "nav.weight", icon: LineChart },
  { href: "/trends", labelKey: "nav.trends", icon: BarChart3 },
  { href: "/calibration", labelKey: "nav.calibration", icon: Sliders },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
  { href: "/admin", labelKey: "nav.admin", icon: Shield, admin: true },
];

function Brand() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
        <Activity className="h-5 w-5 text-brand-400" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-ink">VitaForge</p>
        <p className="text-[11px] text-ink-faint">{t("nav.tagline")}</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, clear } = useAuth();
  const isAdmin = user?.role === "admin";

  const logout = () => {
    clear();
    router.replace("/login");
  };

  const items = NAV.filter((n) => !n.admin || isAdmin);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-2 border-r border-line py-5 md:flex">
        <Brand />
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-2">
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-l-[3px] border-brand-400 bg-brand-500/8 pl-[9px] text-ink"
                    : "border-l-[3px] border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <it.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-400" : "text-ink-muted")} />
                {t(it.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 px-2">
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="flex-1 [&>select]:w-full" />
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">{user?.full_name || user?.email}</p>
              <p className="text-[11px] text-ink-faint">{isAdmin ? t("nav.owner") : t("nav.member")}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-danger" aria-label={t("common.logOut")}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-8">
        {/* Top bar (mobile) — carries the language switch + logout that live in
            the sidebar footer on desktop, so a phone user isn't stranded. */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-3 py-2.5 backdrop-blur md:hidden">
          <Brand />
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={logout}
              aria-label={t("common.logOut")}
              className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 hover:text-danger"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <VerifyEmailBanner />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-surface/95 px-2 py-2 backdrop-blur md:hidden">
        {items.slice(0, 5).map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
                active
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-ink-faint hover:text-ink-muted",
              )}
            >
              <it.icon className="h-5 w-5" />
              {t(it.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
