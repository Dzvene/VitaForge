"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Apple,
  LayoutDashboard,
  LogOut,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { auth, session, type UserOut } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Spinner } from "@/components/primitives";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/foods", label: "Foods", icon: Apple },
  { href: "/params", label: "Parameters", icon: SlidersHorizontal },
];

export default function PanelLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<UserOut | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session.get()) {
      router.replace("/login");
      return;
    }
    auth
      .me()
      .then((u) => {
        if (u.role !== "admin") {
          session.clear();
          router.replace("/login");
          return;
        }
        setMe(u);
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const logout = () => {
    session.clear();
    router.replace("/login");
  };

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-2 border-r border-line py-5 md:flex">
        <div className="flex items-center gap-2.5 px-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
            <Activity className="h-5 w-5 text-brand-400" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">VitaForge</p>
            <p className="text-[11px] text-ink-faint">Admin console</p>
          </div>
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {NAV.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-surface-3 text-ink ring-1 ring-line-strong" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <it.icon className={cn("h-[18px] w-[18px]", active && "text-brand-400")} />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 px-3">
          <ThemeToggle className="w-full" />
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">{me?.email}</p>
              <p className="text-[11px] text-ink-faint">Administrator</p>
            </div>
            <button onClick={logout} aria-label="Log out" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-danger">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur md:hidden">
          <span className="text-sm font-semibold">VitaForge Admin</span>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button onClick={logout} aria-label="Log out" className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 hover:text-danger">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-30 flex items-center justify-around border-t border-line bg-surface/95 px-2 py-2 backdrop-blur md:hidden">
          {NAV.map((it) => {
            const active = pathname === it.href;
            return (
              <Link key={it.href} href={it.href} className={cn("flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium", active ? "text-brand-400" : "text-ink-faint")}>
                <it.icon className="h-5 w-5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
