"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 " +
    "shadow-[0_4px_14px_-5px_rgb(var(--brand-500)/0.5)] hover:shadow-[0_6px_20px_-6px_rgb(var(--brand-500)/0.55)]",
  secondary: "bg-surface text-ink hover:bg-surface-2 border border-line-strong shadow-card",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
  danger: "bg-danger/12 text-danger hover:bg-danger/20 border border-danger/30",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading, full, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-line bg-surface p-5 shadow-card", className)}>{children}</div>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-faint",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "ok" | "warn" | "danger";
}) {
  const tones = {
    neutral: "bg-surface-3 text-ink-muted border-line",
    brand: "bg-brand-500/15 text-brand-400 border-brand-500/30",
    ok: "bg-ok/15 text-ok border-ok/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    danger: "bg-danger/15 text-danger border-danger/30",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-ink-muted", className)} />;
}
