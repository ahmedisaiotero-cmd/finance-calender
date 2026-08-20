import { toDateKey } from "@/lib/calendar-utils";
import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import { buildLifeGraphSnapshot } from "@/lib/intelligence/life-graph/build-life-graph";
import { normalizeCapturedItems } from "@/lib/intelligence/life-graph/normalize-observation";
import { runReasoningEngine } from "@/lib/intelligence/life-graph/reasoning-engine";
import type { SyncBelief, SyncObservation } from "@/lib/intelligence/life-graph/types";
import type { MeaningAnalysis } from "@/lib/intelligence/meaning-engine";
import type { PulsePlan } from "@/lib/pulse/types";
import {
  buildOnboardingInitialReading,
  collectOnboardingSeedTexts,
  type InitialReadingItem,
} from "@/lib/sync-profile/onboarding-reading";
import {
  saveUserProfile,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";
import { forceSaveUniversalCapture } from "@/lib/sync-capture/save-capture";

export type OnboardingCaptureHandlers = {
  items: CapturedSyncItem[];
  addCapturedItem: (
    plan: PulsePlan & { status: "saved" },
    destinations: SyncDestination[],
    title?: string,
    extras?: {
      meaning?: MeaningAnalysis;
      understanding?: string;
      captureSource?: CapturedSyncItem["captureSource"];
      voiceTranscript?: string;
    },
  ) => CapturedSyncItem;
  reference?: Date;
};

function promptAlreadyRemembered(items: CapturedSyncItem[], line: string) {
  const needle = line.trim().toLowerCase();
  if (!needle) return true;
  return items.some((item) => {
    if (item.status === "cancelled" || item.deletedAt) return false;
    const prompt = (item.originalPrompt ?? item.prompt).toLowerCase();
    return prompt.includes(needle) || needle.includes(prompt);
  });
}

export function materializeOnboardingReading(
  profile: SyncUserProfile,
  context: OnboardingCaptureHandlers,
): {
  profile: SyncUserProfile;
  items: CapturedSyncItem[];
  observations: SyncObservation[];
  beliefs: SyncBelief[];
  reading: InitialReadingItem[];
} {
  const reference = context.reference ?? new Date();
  const saved = saveUserProfile(profile);
  let items = [...context.items];

  for (const seed of collectOnboardingSeedTexts(profile)) {
    if (promptAlreadyRemembered(items, seed.text)) continue;

    const result = forceSaveUniversalCapture(
      seed.text,
      {
        items,
        reference,
        captureSource: "typed",
      },
      (plan, destinations, title, extras) => {
        const captured = context.addCapturedItem(plan, destinations, title, extras);
        items = [captured, ...items.filter((item) => item.id !== captured.id)];
        return captured;
      },
    );

    if ("saved" in result && result.saved) {
      continue;
    }
  }

  const snapshot = buildLifeGraphSnapshot({
    normalizations: normalizeCapturedItems(items),
    referenceDate: toDateKey(reference),
  });
  const reasoning = runReasoningEngine(snapshot);

  return {
    profile: saved,
    items,
    observations: snapshot.observations,
    beliefs: reasoning.beliefs,
    reading: buildOnboardingInitialReading(profile),
  };
}
