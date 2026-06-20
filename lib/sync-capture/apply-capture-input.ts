import {
  buildEditPlanFromCommand,
  buildUpdatedCaptureFromPlan,
  resolveCaptureAction,
} from "@/lib/capture-action-resolver";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { CaptureCategoryHint } from "@/lib/sync-capture/capture-hint";
import {
  compactCaptureTitle,
  enrichCapturePlan,
  isSilentCaptureReady,
  prepareCaptureFromText,
  saveCapture,
  type CapturePipelineContext,
  type PreparedCapture,
} from "@/lib/sync-capture/save-capture";
import { detectCaptureClarification } from "@/lib/sync-capture/capture-clarification";
import type { MeaningAnalysis } from "@/lib/intelligence/meaning-engine";
import {
  CAPTURE_CLARIFY_MORE,
  CAPTURE_CLARIFY_PLACE,
  CAPTURE_CLARIFY_REMEMBER_WHAT,
  CAPTURE_CLARIFY_WHEN,
  CAPTURE_CLARIFY_WHO,
  CAPTURE_DELETE_NOT_FOUND,
  CAPTURE_DUPLICATE,
  CAPTURE_EDIT_AMBIGUOUS,
  CAPTURE_EDIT_NOT_FOUND,
  CAPTURE_VAGUE,
} from "@/lib/mobile-prototype/sync-voice";
import { detectAmbiguity } from "@/lib/trust/ambiguity-detection";
import { resolveCaptureReference } from "@/lib/trust/reference-resolution";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type ApplyCaptureContext = {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  categoryHint?: CaptureCategoryHint;
};

export type ApplyCaptureHandlers = {
  addCapturedItem: (
    ...args: Parameters<typeof saveCapture>[1] extends infer T ? [T] : never
  ) => CapturedSyncItem;
  updateCapturedItem: (
    id: string,
    updates: Partial<CapturedSyncItem>,
  ) => CapturedSyncItem | null;
  softDeleteCapturedItem: (id: string) => void;
};

export type ApplyCaptureResult =
  | {
      status: "saved";
      kind: "create";
      prepared: PreparedCapture;
      title: string;
      overlapNotice?: string;
    }
  | {
      status: "saved";
      kind: "edit";
      title: string;
      itemId: string;
      meaning?: MeaningAnalysis;
    }
  | {
      status: "saved";
      kind: "delete";
      title: string;
      itemId: string;
      meaning?: MeaningAnalysis;
    }
  | {
      status: "needs_clarification";
      draftText: string;
      message: string;
      suggestions: string[];
    }
  | { status: "too_vague"; message: string }
  | { status: "duplicate"; title: string; message: string }
  | { status: "empty" };

const VAGUE_CAPTURE_MESSAGE = CAPTURE_VAGUE;

function isVagueCaptureInput(text: string) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ");

  if (!normalized) return true;

  const vagueExact = new Set([
    "whats up",
    "what's up",
    "hey",
    "hi",
    "hello",
    "remember this",
    "remember",
    "thanks",
    "thank you",
    "ok",
    "okay",
    "help",
    "test",
    "testing",
  ]);

  if (vagueExact.has(normalized)) return true;

  if (/^(call|text|message)\s+(her|him|them)\b/.test(normalized)) {
    return true;
  }

  if (normalized === "tomorrow" || normalized === "today") return true;

  const words = normalized.split(" ").filter(Boolean);
  const hasSignal =
    /\d/.test(normalized) ||
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight|next|paid|payday|due|birthday|rent|gym|work|mom|dad|trip|meeting|appointment|overtime|off|anniversary|girlfriend|boyfriend)\b/.test(
      normalized,
    );

  return words.length <= 2 && !hasSignal;
}

function ambiguousReferenceMessage(text: string): string | null {
  const normalized = text.trim().toLowerCase();
  if (/^(call|text|message)\s+(her|him|them)\b/.test(normalized)) {
    return CAPTURE_CLARIFY_WHO;
  }
  if (/\bremember this\b/.test(normalized)) {
    return CAPTURE_CLARIFY_REMEMBER_WHAT;
  }
  return null;
}

function clarificationForCapture(
  plan: ReturnType<typeof createPulsePlan>,
  destinations: string[],
): { message: string; suggestions: string[] } {
  const timeline = plan.timeline;
  const hasDate = Boolean(timeline?.startDate || timeline?.deadlineDate);

  if (destinations.length === 0) {
    return {
      message: CAPTURE_CLARIFY_PLACE,
      suggestions: ["today", "tomorrow", "Friday"],
    };
  }

  if (!hasDate) {
    return {
      message: CAPTURE_CLARIFY_WHEN,
      suggestions: ["today", "tomorrow", "Friday", "next Friday"],
    };
  }

  return {
    message: CAPTURE_CLARIFY_MORE,
    suggestions: ["today", "tomorrow", "next week"],
  };
}

function pipelineContext(
  context: ApplyCaptureContext,
): CapturePipelineContext {
  return {
    items: context.items,
    workSchedule: context.workSchedule,
    reference: context.reference,
    categoryHint: context.categoryHint,
  };
}

export function applyCaptureInput(
  text: string,
  context: ApplyCaptureContext,
  handlers: {
    addCapturedItem: (
      plan: PreparedCapture["plan"] & { status: "saved" },
      destinations: PreparedCapture["destinations"],
      title?: string,
      extras?: { meaning?: PreparedCapture["meaning"] },
    ) => CapturedSyncItem;
    updateCapturedItem: (
      id: string,
      updates: Partial<CapturedSyncItem>,
    ) => CapturedSyncItem | null;
    softDeleteCapturedItem: (id: string) => void;
  },
): ApplyCaptureResult {
  const trimmed = text.trim();
  if (!trimmed) return { status: "empty" };

  if (isVagueCaptureInput(trimmed)) {
    const specific = ambiguousReferenceMessage(trimmed);
    return {
      status: "too_vague",
      message: specific ?? VAGUE_CAPTURE_MESSAGE,
    };
  }

  const reference = context.reference ?? new Date();
  const action = resolveCaptureAction(trimmed, context.items);
  const referenceResolution = resolveCaptureReference({
    commandText: trimmed,
    items: context.items,
  });

  if (action.intent === "delete" && action.primaryTarget) {
    const meaning = action.primaryTarget.meaning;
    handlers.softDeleteCapturedItem(action.primaryTarget.id);
    return {
      status: "saved",
      kind: "delete",
      title: action.primaryTarget.title,
      itemId: action.primaryTarget.id,
      meaning,
    };
  }

  if (action.intent === "delete") {
    const ambiguity = detectAmbiguity({
      text: trimmed,
      commandIntent: action.commandIntent,
      referenceResolution,
      now: reference,
    });
    return {
      status: "needs_clarification",
      draftText: trimmed,
      message:
        ambiguity.reason ?? CAPTURE_DELETE_NOT_FOUND,
      suggestions: ["rent reminder", "gym workout", "payday"],
    };
  }

  if (action.intent === "edit" && action.primaryTarget) {
    const ambiguity = detectAmbiguity({
      text: trimmed,
      commandIntent: action.commandIntent,
      referenceResolution,
      now: reference,
    });
    if (ambiguity.ambiguous) {
      return {
        status: "needs_clarification",
        draftText: trimmed,
        message:
          ambiguity.reason ?? CAPTURE_EDIT_AMBIGUOUS,
        suggestions: ["tomorrow", "Friday", "next week"],
      };
    }

    const plan = buildEditPlanFromCommand(
      action.primaryTarget,
      action.commandIntent,
      trimmed,
      { now: reference, userContext: { workSchedule: context.workSchedule } },
    );
    const enriched = enrichCapturePlan(plan, reference);
    const prepared = prepareCaptureFromText(trimmed, {
      ...pipelineContext(context),
      excludeCaptureId: action.primaryTarget.id,
      targetTitle: compactCaptureTitle(enriched),
    });
    const destinations =
      prepared?.destinations ??
      sanitizeSyncDestinations(action.primaryTarget.destinations);
    const title = compactCaptureTitle(enriched);
    const updated = buildUpdatedCaptureFromPlan(
      action.primaryTarget,
      enriched,
      destinations,
      title,
    );
    handlers.updateCapturedItem(action.primaryTarget.id, updated);
    return {
      status: "saved",
      kind: "edit",
      title,
      itemId: action.primaryTarget.id,
      meaning: updated.meaning ?? prepared?.meaning ?? action.primaryTarget.meaning,
    };
  }

  if (action.intent === "edit") {
    const ambiguity = detectAmbiguity({
      text: trimmed,
      commandIntent: action.commandIntent,
      referenceResolution,
      now: reference,
    });
    return {
      status: "needs_clarification",
      draftText: trimmed,
      message:
        ambiguity.reason ?? CAPTURE_EDIT_NOT_FOUND,
      suggestions: ["tomorrow", "Friday", "next Friday"],
    };
  }

  const prepared = prepareCaptureFromText(trimmed, pipelineContext(context));
  if (prepared && isSilentCaptureReady(prepared)) {
    const captureClarification = detectCaptureClarification(
      trimmed,
      prepared,
      reference,
    );
    if (captureClarification) {
      return {
        status: "needs_clarification",
        draftText: trimmed,
        message: captureClarification.message,
        suggestions: captureClarification.suggestions,
      };
    }

    if (prepared.duplicate.isDuplicate) {
      return {
        status: "duplicate",
        title: prepared.title,
        message: CAPTURE_DUPLICATE,
      };
    }

    saveCapture(prepared, handlers.addCapturedItem, {
      skipDuplicateCheck: false,
      protectTime: prepared.meaning.protection.recommended,
    });
    const overlap = prepared.preview.when.overlap;
    const overlapNotice = overlap
      ? [overlap.headline, overlap.conflictMeaning].filter(Boolean).join(" ")
      : undefined;
    return {
      status: "saved",
      kind: "create",
      prepared,
      title: prepared.title,
      overlapNotice,
    };
  }

  const rawPlan = createPulsePlan(trimmed, {
    timeline: { now: reference },
    categoryHint: context.categoryHint,
  });
  const plan = enrichCapturePlan(rawPlan, reference);
  const destinations = prepared?.destinations ?? [];
  const clarification = clarificationForCapture(plan, destinations);
  const ambiguous = ambiguousReferenceMessage(trimmed);

  return {
    status: "needs_clarification",
    draftText: trimmed,
    message: ambiguous ?? clarification.message,
    suggestions: clarification.suggestions,
  };
}
