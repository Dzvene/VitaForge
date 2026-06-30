"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X, Loader2, AlertTriangle } from "lucide-react";

type ScannerState = "starting" | "scanning" | "error";

export function BarcodeScannerDialog({
  open,
  onDetected,
  onClose,
}: {
  open: boolean;
  onDetected: (barcode: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScannerState>("starting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setState("starting");
    setErrorMsg("");

    let stopped = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let controls: any = null;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (stopped) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current!,
          (result) => {
            if (stopped || !result) return;
            stopped = true;
            controls?.stop();
            onDetected(result.getText());
            onClose();
          },
        );
        if (!stopped) setState("scanning");
      } catch (e) {
        if (stopped) return;
        const msg = e instanceof Error ? e.message : "";
        const denied = msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("permission");
        setErrorMsg(denied ? t("diary.addFood.scanDenied") : t("diary.addFood.scanUnsupported"));
        setState("error");
      }
    }

    start();

    return () => {
      stopped = true;
      try { controls?.stop(); } catch { /* ignore */ }
    };
  }, [open, onDetected, onClose, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white">{t("diary.addFood.scanTitle")}</p>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label={t("common.close") ?? "Close"}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* camera area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {/* dim overlay with cutout via box-shadow trick */}
        {state === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-44 w-72">
              {/* cutout border via SVG corners */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 288 176">
                {/* top-left */}
                <path d="M0 32 L0 0 L32 0" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
                {/* top-right */}
                <path d="M256 0 L288 0 L288 32" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
                {/* bottom-left */}
                <path d="M0 144 L0 176 L32 176" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
                {/* bottom-right */}
                <path d="M256 176 L288 176 L288 144" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {/* scan line animation */}
              <div className="absolute inset-x-2 top-1/2 h-px bg-brand-400/80 shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] animate-scan-line" />
            </div>
          </div>
        )}

        {/* status overlay */}
        {state === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-sm text-white/80">{t("diary.addFood.scanStarting")}</p>
          </div>
        )}

        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-8 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
            <p className="text-sm text-white">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* hint */}
      {state === "scanning" && (
        <p className="py-4 text-center text-sm text-white/60">{t("diary.addFood.scanHint")}</p>
      )}
    </div>,
    document.body,
  );
}
