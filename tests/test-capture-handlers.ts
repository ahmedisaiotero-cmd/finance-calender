import type { CapturedSyncItem } from "@/lib/captured-items";
import type { PulsePlan } from "@/lib/pulse/types";
import type { MeaningAnalysis } from "@/lib/intelligence/meaning-engine";
import type { SyncDestination } from "@/lib/captured-items";

export function createTestCaptureStore(initial: CapturedSyncItem[] = []) {
  const items = [...initial];

  const handlers = {
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
    ): CapturedSyncItem => {
      const now = new Date().toISOString();
      const captured: CapturedSyncItem = {
        id: plan.id,
        title: title ?? plan.title,
        category: plan.category,
        prompt: plan.prompt,
        originalPrompt: plan.originalPrompt,
        normalizationCorrections: plan.normalizationCorrections,
        destinations,
        dateLabel: plan.dateLabel,
        timeLabel: plan.timeLabel,
        amount: plan.parsedInput?.amount ?? null,
        frequency: plan.parsedInput?.frequency,
        moneyType: plan.parsedInput?.moneyType,
        workAvailability: plan.parsedInput?.workAvailability,
        timeline: plan.timeline,
        meaning: extras?.meaning,
        understanding: extras?.understanding,
        captureSource: extras?.captureSource ?? "typed",
        voiceTranscript: extras?.voiceTranscript,
        status: "active",
        createdAt: plan.createdAt ?? now,
        updatedAt: now,
        deletedAt: null,
      };

      const index = items.findIndex((item) => item.id === captured.id);
      if (index >= 0) {
        items[index] = captured;
      } else {
        items.unshift(captured);
      }

      return captured;
    },
    updateCapturedItem: (
      id: string,
      updates: Partial<CapturedSyncItem>,
    ): CapturedSyncItem | null => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return null;

      const updated: CapturedSyncItem = {
        ...items[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      items[index] = updated;
      return updated;
    },
    softDeleteCapturedItem: (id: string) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return;
      items[index] = {
        ...items[index],
        deletedAt: new Date().toISOString(),
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      };
    },
  };

  return { items, handlers };
}
