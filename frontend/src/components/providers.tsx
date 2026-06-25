"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import i18n from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

/**
 * Refetch locale-dependent server copy when the UI language changes. Coaching
 * warnings/hints/guidance and calibration reasons are translated server-side
 * (Accept-Language), so a mid-session language switch must invalidate their
 * cached queries — otherwise they stay in the old language until they expire.
 */
function LocaleQuerySync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["coaching"] });
      void queryClient.invalidateQueries({ queryKey: ["calibration"] });
    };
    i18n.on("languageChanged", invalidate);
    return () => i18n.off("languageChanged", invalidate);
  }, [queryClient]);
  return null;
}

/** Sync the theme store from localStorage once on mount (the no-flash script in
 *  the document head has already applied the class; this aligns the store state
 *  so the toggle reflects the active theme). */
function ThemeInit() {
  const init = useTheme((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ThemeInit />
        <LocaleQuerySync />
        <ToastProvider>{children}</ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
