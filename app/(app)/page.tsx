"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { DailyBriefHome } from "@/components/sync/daily-brief-home";
import { useCapturedItems } from "@/lib/captured-items";
import {
  canEnterAuthenticatedHome,
  decideAuthenticatedHomeEntry,
  interpretProfileGetResponse,
  mergeOnboardingProfile,
  sanitizeSyncUserProfile,
} from "@/lib/sync-profile/complete-onboarding";
import { materializeOnboardingReading } from "@/lib/sync-profile/materialize-onboarding-reading";
import {
  loadUserProfile,
  saveUserProfile,
} from "@/lib/sync-profile/user-profile";

export default function HomePage() {
  const router = useRouter();
  const { activeItems, addCapturedItem, hydrated } = useCapturedItems();
  const itemsRef = useRef(activeItems);
  itemsRef.current = activeItems;
  const addRef = useRef(addCapturedItem);
  addRef.current = addCapturedItem;
  const [decision, setDecision] = useState<"wait" | "enter" | "onboarding">(
    "wait",
  );

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    async function hydrate() {
      const local = loadUserProfile();
      const localDecision = decideAuthenticatedHomeEntry({
        remoteStatus: "loading",
        localProfile: local,
        remoteProfile: null,
      });

      if (localDecision === "enter" && canEnterAuthenticatedHome(local)) {
        materializeOnboardingReading(local, {
          items: itemsRef.current,
          addCapturedItem: addRef.current,
        });
        if (!cancelled) setDecision("enter");
      }

      try {
        const response = await fetch("/api/profile", { credentials: "include" });
        const body = (await response.json().catch(() => ({}))) as {
          profile?: unknown;
        };
        const interpreted = interpretProfileGetResponse({
          ok: response.ok,
          status: response.status,
          body: {
            profile: body.profile
              ? sanitizeSyncUserProfile(body.profile)
              : null,
          },
        });
        const next = decideAuthenticatedHomeEntry({
          remoteStatus: interpreted.remoteStatus,
          localProfile: loadUserProfile(),
          remoteProfile: interpreted.profile,
        });

        if (cancelled) return;

        if (next === "onboarding") {
          setDecision("onboarding");
          router.replace("/onboarding");
          return;
        }

        if (next === "enter") {
          const remote = interpreted.profile;
          if (remote && canEnterAuthenticatedHome(remote)) {
            const merged = mergeOnboardingProfile(loadUserProfile(), remote);
            saveUserProfile(merged);
            materializeOnboardingReading(merged, {
              items: itemsRef.current,
              addCapturedItem: addRef.current,
            });
          }
          setDecision("enter");
        }
      } catch {
        const fallback = decideAuthenticatedHomeEntry({
          remoteStatus: "error",
          localProfile: loadUserProfile(),
          remoteProfile: null,
        });
        if (cancelled) return;
        if (fallback === "onboarding") {
          setDecision("onboarding");
          router.replace("/onboarding");
          return;
        }
        setDecision(fallback === "enter" ? "enter" : "wait");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [hydrated, router]);

  if (decision !== "enter") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-muted-foreground">
          One moment — pulling your briefing together.
        </p>
      </div>
    );
  }

  return <DailyBriefHome />;
}
