import type { CapturedSyncItem } from "@/lib/captured-items";
import type { CaptureCategoryHint } from "@/lib/sync-capture/capture-hint";
import {
  applyCaptureInput,
  type ApplyCaptureContext,
  type ApplyCaptureResult,
} from "@/lib/sync-capture/apply-capture-input";
import {
  captureSourceMetadata,
  resolveCaptureText,
  type CaptureSourceMetadata,
  type SyncCaptureInput,
} from "@/lib/sync-capture/capture-source";
import {
  saveCapture,
  type PreparedCapture,
} from "@/lib/sync-capture/save-capture";
import { CAPTURE_DUPLICATE } from "@/lib/mobile-prototype/sync-voice";
import type { PreparedCapture } from "@/lib/sync-capture/save-capture";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { PulsePlan } from "@/lib/pulse/types";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { describeItemTiming } from "@/lib/mobile-prototype/build-daily-brief";
import { buildMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { formatCaptureAcknowledgment as voiceAcknowledgment } from "@/lib/mobile-prototype/sync-voice";

export type BriefCaptureResult = {
  plan: PulsePlan & { status: "saved" };
  destinations: ReturnType<typeof sanitizeSyncDestinations>;
  title: string;
  meaning: PreparedCapture["meaning"];
};

export type BriefCaptureAttempt =
  | { status: "saved"; result: BriefCaptureResult; kind: "create" | "edit" | "delete"; overlapNotice?: string }
  | {
      status: "needs_clarification";
      draftText: string;
      message: string;
      suggestions: string[];
    }
  | { status: "too_vague"; message: string }
  | { status: "duplicate"; message: string; title: string; existingItem?: CapturedSyncItem }
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
      overlapNotice: result.overlapNotice,
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
        meaning: result.meaning ?? {
          importance: "medium",
          meaningLabel: "Updated",
          summary: `Updated — ${result.title}.`,
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
        meaning: result.meaning ?? {
          importance: "low",
          meaningLabel: "Released",
          summary: `Let go — ${result.title}.`,
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
  input: SyncCaptureInput | string,
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
  const text = resolveCaptureText(input);
  const sourceMeta = captureSourceMetadata(input);

  return (
    toBriefAttempt(
      applyCaptureInput(text, { ...context, ...sourceMeta }, handlers),
    ) ?? { status: "empty" }
  );
}

export function captureFromBriefInput(
  input: SyncCaptureInput | string,
  context: {
    items: CapturedSyncItem[];
    workSchedule?: PersistedWorkSchedule | null;
    reference?: Date;
    categoryHint?: CaptureCategoryHint;
  },
  handlers: Parameters<typeof attemptBriefCapture>[2],
): BriefCaptureResult | null {
  const attempt = attemptBriefCapture(input, context, handlers);
  if (attempt.status === "saved" && attempt.kind === "create") {
    return attempt.result;
  }
  return null;
}

export function commitPreparedCapture(
  prepared: PreparedCapture,
  context: Omit<ApplyCaptureContext, "captureSource" | "voiceTranscript">,
  sourceMeta: CaptureSourceMetadata,
  handlers: Parameters<typeof attemptBriefCapture>[2],
  options?: { skipDuplicateCheck?: boolean; forceNewId?: boolean },
): BriefCaptureAttempt {
  if (prepared.duplicate.isDuplicate && !options?.skipDuplicateCheck) {
    const existing = prepared.duplicate.bestMatch?.item;
    return {
      status: "duplicate",
      title: prepared.title,
      message: CAPTURE_DUPLICATE,
      existingItem: existing,
    };
  }

  const toSave: PreparedCapture =
    options?.forceNewId
      ? {
          ...prepared,
          plan: { ...prepared.plan, id: crypto.randomUUID() },
        }
      : prepared;

  const saveContext: ApplyCaptureContext = {
    ...context,
    ...sourceMeta,
  };

  saveCapture(toSave, handlers.addCapturedItem, {
    skipDuplicateCheck: options?.skipDuplicateCheck ?? false,
    protectTime: toSave.meaning.protection.recommended,
    captureSource: saveContext.captureSource ?? "typed",
    voiceTranscript: saveContext.voiceTranscript,
  });

  const overlap = toSave.preview.when.overlap;
  const overlapNotice = overlap
    ? [overlap.headline, overlap.conflictMeaning].filter(Boolean).join(" ")
    : undefined;

  return {
    status: "saved",
    kind: "create",
    overlapNotice,
    result: {
      plan: { ...toSave.plan, status: "saved" },
      destinations: toSave.destinations,
      title: toSave.title,
      meaning: toSave.meaning,
    },
  };
}

export function formatCaptureAcknowledgment(
  captured: BriefCaptureResult,
  kind: "create" | "edit" | "delete" = "create",
  reference = new Date(),
) {
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

  const profile = buildMemoryProfile(stub, reference);
  const understanding = buildMemoryUnderstanding(
    {
      title: captured.title,
      prompt: captured.plan.prompt,
      originalPrompt: captured.plan.originalPrompt,
      destinations: captured.destinations,
      timeline: captured.plan.timeline,
      category: captured.plan.category,
      workAvailability: captured.plan.parsedInput?.workAvailability,
      moneyType: captured.plan.parsedInput?.moneyType,
      parsedInput: captured.plan.parsedInput,
    },
    reference,
  );

  const acknowledgmentDetail =
    kind === "create"
      ? profile.weight === "light" ||
        profile.type === "emotion" ||
        profile.type === "expense" ||
        profile.type === "habit" ||
        profile.type === "meal"
        ? understanding
        : describeItemTiming(stub, reference)
      : null;

  return voiceAcknowledgment(kind, captured.title, acknowledgmentDetail);
}
