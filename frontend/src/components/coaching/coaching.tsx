"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, GraduationCap, Lightbulb, ShieldAlert } from "lucide-react";
import { coaching } from "@/lib/api/endpoints";
import { qk, useHints, useWarnings } from "@/lib/api/hooks";
import type { GuidanceItem } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { Badge, Button } from "@/components/ui/primitives";

// §5.2 — active warnings that should auto-show, with accept / mute.
export function WarningList() {
  const { data } = useWarnings();
  const qc = useQueryClient();
  const accept = useMutation({
    mutationFn: (t: string) => coaching.accept(t),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.warnings }),
  });
  const dismiss = useMutation({
    mutationFn: (t: string) => coaching.dismiss(t),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.warnings }),
  });

  const active = (data ?? []).filter((w) => w.auto_show);
  if (active.length === 0) return null;

  return (
    <div className="space-y-3">
      {active.map((w) => (
        <div key={w.type} className="card-2 flex gap-3 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{w.title}</p>
            <p className="mt-1 text-sm text-ink-muted">{w.message}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => accept.mutate(w.type)}>
                Got it
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dismiss.mutate(w.type)}>
                Don&apos;t show again
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const GUIDANCE_TONE: Record<GuidanceItem["kind"], string> = {
  protein_low: "text-macro-protein",
  fat_high: "text-macro-fat",
  carb_room: "text-macro-carb",
  on_track: "text-ok",
  overage: "text-brand-400",
};

// §5.3 / §5.4 — dosed in-day navigation, no blame.
export function GuidanceList({ items }: { items: GuidanceItem[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3">
          <Lightbulb className={cn("mt-0.5 h-4 w-4 shrink-0", GUIDANCE_TONE[it.kind])} />
          <p className="text-sm text-ink-muted">{it.message}</p>
        </div>
      ))}
    </div>
  );
}

// §5.1 — passive hints, collapsible.
export function HintsRail() {
  const { data } = useHints();
  const [open, setOpen] = useState<string | null>(null);
  if (!data?.length) return null;

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-ink">Why this method</h3>
        <Badge tone="brand" className="ml-auto">
          learn
        </Badge>
      </div>
      <div className="divide-y divide-line">
        {data.map((h) => {
          const isOpen = open === h.key;
          return (
            <div key={h.key} className="py-1">
              <button
                onClick={() => setOpen(isOpen ? null : h.key)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left"
              >
                <span className="text-sm font-medium text-ink">{h.title}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-ink-faint transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && <p className="pb-3 pr-6 text-sm text-ink-muted">{h.body}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
