import type { CapturedSyncItem } from "@/lib/captured-items";
import type { CaptureCategoryHint } from "@/lib/sync-capture/capture-hint";
import {
  applyCaptureInput,
  type ApplyCaptureResult,
} from "@/lib/sync-capture/apply-capture-input";
import type { PreparedCapture } from "@/lib/sync-capture/save-capture";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { PulsePlan } from "@/lib/pulse/types";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { describeItemTiming } from "@/lib/mobile-prototype/build-daily-brief";

export type BriefCaptureResult = {
  plan: PulsePlan & { status: "saved" };
  destinations: ReturnType<typeof sanitizeSyncDestinations>;
  title: string;
  meaning: PreparedCapture["meaning"];
};

export type BriefCaptureAttempt =
  | { status: "saved"; result: BriefCaptureResult; kind: "create" | "edit" | "delete" }
  | {
      status: "needs_clarification";
      draftText: string;
      message: string;
      suggestions: string[];
    }
  | { status: "too_vague"; message: string }
  | { status: "duplicate"; message: string; title: string }
  | { status: "empty" };

function toBriefAttempt(
  result: ApplyCaptureResult,
): BriefCaptureAttempt | null {
  if (result.status === "empty") return { status: "empty" };
  if (result.status === "too_vague") return result;
  if (result.status === "duplicate") return result;

  if (result.status === "needs_clarification") {
    return {
      status: "needs_clarification",
      draftText: result.draftText,
      message: result.message,
      suggestions: result.suggestions,
    };
  }

  if (result.status === "saved" && result.kind === "create") {
    return {
      status: "saved",
      kind: "create",
      result: {
        plan: { ...result.prepared.plan, status: "saved" },
        destinations: result.prepared.destinations,
        title: result.prepared.title,
        meaning: result.prepared.meaning,
      },
    };
  }

  if (result.status === "saved" && result.kind === "edit") {
    const plan = createPulsePlan(result.title, {
      timeline: { now: new Date() },
    });
    return {
      status: "saved",
      kind: "edit",
      result: {
        plan: { ...plan, id: result.itemId, status: "saved", title: result.title },
        destinations: sanitizeSyncDestinations(["Calendar"]),
        title: result.title,
        meaning: {
          importance: "medium",
          meaningLabel: "Updated memory",
          summary: `Sync updated ${result.title}.`,
          protection: {
            eligible: false,
            recommended: false,
            protected: false,
          },
          suggestedActions: [],
        },
      },
    };
  }

  if (result.status === "saved" && result.kind === "delete") {
    const plan = createPulsePlan(result.title, { timeline: { now: new Date() } });
    return {
      status: "saved",
      kind: "delete",
      result: {
        plan: { ...plan, id: result.itemId, status: "saved", title: result.title },
        destinations: [],
        title: result.title,
        meaning: {
          importance: "low",
          meaningLabel: "Removed",
          summary: `Sync removed ${result.title}.`,
          protection: {
            eligible: false,
            recommended: false,
            protected: false,
          },
          suggestedActions: [],
        },
      },
    };
  }

  return null;
}

export function attemptBriefCapture(
  text: string,
  context: {
    items: CapturedSyncItem[];
    workSchedule?: PersistedWorkSchedule | null;
    reference?: Date;
    categoryHint?: CaptureCategoryHint;
  },
  handlers: {
    addCapturedItem: (
      plan: PulsePlan & { status: "saved" },
      destinations: CapturedSyncItem["destinations"],
      title?: string,
      extras?: { meaning?: PreparedCapture["meaning"] },
    ) => CapturedSyncItem;
    updateCapturedItem: (
      id: string,
      updates: Partial<CapturedSyncItem>,
    ) => CapturedSyncItem | null;
    softDeleteCapturedItem: (id: string) => void;
  },
): BriefCaptureAttempt {
  return (
    toBriefAttempt(
      applyCaptureInput(text, context, handlers),
    ) ?? { status: "empty" }
  );
}

export function captureFromBriefInput(
  text: string,
  context: {
    items: CapturedSyncItem[];
    workSchedule?: PersistedWorkSchedule | null;
    reference?: Date;
    categoryHint?: CaptureCategoryHint;
  },
  handlers: Parameters<typeof attemptBriefCapture>[2],
): BriefCaptureResult | null {
  const attempt = attemptBriefCapture(text, context, handlers);
  if (attempt.status === "saved" && attempt.kind === "create") {
    return attempt.result;
  }
  return null;
}

export function formatCaptureAcknowledgment(
  captured: BriefCaptureResult,
  kind: "create" | "edit" | "delete" = "create",
  reference = new Date(),
) {
  if (kind === "delete") {
    return `Removed — ${captured.title}.`;
  }

  if (kind === "edit") {
    return `Updated — ${captured.title}.`;
  }

  const stub: CapturedSyncItem = {
    id: captured.plan.id,
    title: captured.title,
    category: captured.plan.category,
    prompt: captured.plan.prompt,
    destinations: captured.destinations,
    dateLabel: captured.plan.dateLabel,
    timeLabel: captured.plan.timeLabel,
    timeline: captured.plan.timeline,
    workAvailability: captured.plan.parsedInput?.workAvailability,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const timing = describeItemTiming(stub, reference);
  if (timing) {
    return `Remembered — ${timing}.`;
  }

  return `Remembered — ${captured.title}.`;
}
