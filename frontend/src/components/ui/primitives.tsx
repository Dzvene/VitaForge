"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

// ----- Button -----
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 shadow-[0_6px_20px_-8px_rgba(61,123,255,0.7)]",
  secondary:
    "bg-surface-3 text-ink hover:bg-line border border-line-strong",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-3",
  danger: "bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, full, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
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

// ----- Field wrapper -----
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="label block">{label}</span>}
      {children}
      {error ? (
        <span className="block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  "w-full h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-faint " +
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputBase, "nums", className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(inputBase, "appearance-none pr-8", className)} {...rest}>
        {children}
      </select>
    );
  },
);

// ----- Card -----
export function Card({
  className,
  children,
  as: As = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article";
}) {
  return <As className={cn("card p-5", className)}>{children}</As>;
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-ink">{children}</h3>
      {right}
    </div>
  );
}

// ----- Badge -----
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "ok" | "warn" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-3 text-ink-muted border-line",
    brand: "bg-brand-500/15 text-brand-400 border-brand-500/30",
    ok: "bg-ok/15 text-ok border-ok/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    danger: "bg-danger/15 text-danger border-danger/30",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ----- Spinner / Skeleton / EmptyState -----
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-ink-muted", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line py-10 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

// ----- Segmented control -----
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "bg-brand-500 text-white"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
