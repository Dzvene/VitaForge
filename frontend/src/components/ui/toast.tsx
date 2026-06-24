"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "ok" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-card animate-fade-up",
              t.tone === "ok" && "border-ok/30 bg-surface-2 text-ink",
              t.tone === "error" && "border-danger/30 bg-surface-2 text-ink",
              t.tone === "info" && "border-line bg-surface-2 text-ink",
            )}
          >
            {t.tone === "ok" && <CheckCircle2 className="h-4 w-4 text-ok" />}
            {t.tone === "error" && <XCircle className="h-4 w-4 text-danger" />}
            {t.tone === "info" && <Info className="h-4 w-4 text-brand-400" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
