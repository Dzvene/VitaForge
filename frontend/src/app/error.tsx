"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/primitives";

/**
 * Global error boundary. Without it an uncaught render/data error blanks the
 * page; here we show a calm fallback and a retry that re-runs the segment.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface it for the browser console / error reporting; never swallow.
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface-2 p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-faint">
          That section failed to load. You can try again — your data is safe.
        </p>
        <Button full className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
