"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DailyBriefHome } from "@/components/sync/daily-brief-home";
import { isOnboardingComplete } from "@/lib/sync-profile/user-profile";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isOnboardingComplete()) {
      router.replace("/onboarding");
    }
  }, [router]);

  if (typeof window !== "undefined" && !isOnboardingComplete()) {
    return null;
  }

  return <DailyBriefHome />;
}
