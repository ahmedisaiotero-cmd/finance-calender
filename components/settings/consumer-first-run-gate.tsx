"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { shouldShowConsumerFirstRun } from "@/lib/auth/consumer-first-run";

export function ConsumerFirstRunGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      fetch("/api/account", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok || cancelled) return;
          const json = (await response.json()) as {
            user?: { consumerFirstRunAt?: string | null };
          };
          if (
            shouldShowConsumerFirstRun({
              consumerFirstRunAt: json.user?.consumerFirstRunAt,
              pathname,
            })
          ) {
            router.replace("/start");
          }
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
