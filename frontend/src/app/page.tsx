"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { Spinner } from "@/components/ui/primitives";

export default function Home() {
  const router = useRouter();
  const { accessToken, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? "/dashboard" : "/login");
  }, [accessToken, hydrated, router]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner className="h-6 w-6" />
    </div>
  );
}
