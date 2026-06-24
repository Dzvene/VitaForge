"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
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
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  admin?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/diary", label: "Diary", icon: BookOpen },
  { href: "/weight", label: "Weight", icon: LineChart },
  { href: "/calibration", label: "Calibration", icon: Sliders },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield, admin: true },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
        <Activity className="h-5 w-5 text-brand-400" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-ink">Baseline</p>
        <p className="text-[11px] text-ink-faint">calibrate · track · adapt</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
                    ? "bg-surface-3 text-ink ring-1 ring-line-strong"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <it.icon className={cn("h-[18px] w-[18px]", active && "text-brand-400")} />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-2">
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">{user?.full_name || user?.email}</p>
              <p className="text-[11px] text-ink-faint">{isAdmin ? "Owner" : "Member"}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-danger" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-8">
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
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] font-medium",
                active ? "text-brand-400" : "text-ink-faint",
              )}
            >
              <it.icon className="h-5 w-5" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
