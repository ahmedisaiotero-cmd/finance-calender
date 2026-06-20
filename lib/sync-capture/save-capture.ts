import { toDateKey } from "@/lib/calendar-utils";
import { detectDuplicateCapture } from "@/lib/capture-duplicate-detection";
import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import type { MeaningAnalysis } from "@/lib/intelligence/meaning-engine";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import {
  buildSyncPreviewViewModel,
  type SyncPreviewViewModel,
} from "@/lib/pulse/sync-preview-view-model";
import type {
  PulseMoneyType,
  PulsePlan,
  PulsePlanCategory,
} from "@/lib/pulse/types";
import {
  profileToSyncUserContext,
  loadUserProfile,
} from "@/lib/sync-profile/user-profile";
import type { CaptureCategoryHint } from "@/lib/sync-capture/capture-hint";
import { buildMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import { cleanMemoryTitle } from "@/lib/sync-capture/memory-title";
import {
  detectSyncTimeBlockOverlaps,
  proposedSyncTimeBlocksFromPlan,
} from "@/lib/sync-time-blocks";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type CapturePipelineContext = {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  selectedDestinations?: SyncDestination[];
  excludeCaptureId?: string;
  targetTitle?: string;
  previewMode?: SyncPreviewViewModel["mode"];
  categoryHint?: CaptureCategoryHint;
};

export type PreparedCapture = {
  plan: PulsePlan;
  preview: SyncPreviewViewModel;
  destinations: SyncDestination[];
  title: string;
  meaning: MeaningAnalysis;
  duplicate: ReturnType<typeof detectDuplicateCapture>;
};

export type SavedCaptureResult = {
  plan: PulsePlan & { status: "saved" };
  destinations: SyncDestination[];
  title: string;
  meaning: MeaningAnalysis;
  item: CapturedSyncItem;
  duplicate: PreparedCapture["duplicate"];
};

type CompactTitleInput = {
  category: PulsePlanCategory;
  timeLabel: string;
  title: string;
  prompt: string;
  parsedInput?: PulsePlan["parsedInput"];
  moneyType?: PulseMoneyType;
};

export function compactCaptureTitle(plan: CompactTitleInput): string {
  return cleanMemoryTitle(plan);
}

export function enrichCapturePlan(plan: PulsePlan, reference: Date): PulsePlan {
  const timeline = plan.timeline;
  if (!timeline) return plan;

  if (plan.parsedInput?.workAvailability === "off") {
    const dateKey =
      timeline.startDate ??
      timeline.deadlineDate ??
      (/\btomorrow\b/i.test(plan.prompt)
        ? toDateKey(new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + 1))
        : /\btoday\b/i.test(plan.prompt)
          ? toDateKey(reference)
          : timeline.startDate);

    return {
      ...plan,
      originalPrompt: plan.originalPrompt ?? plan.prompt,
      dateLabel: timeline.label ?? plan.dateLabel,
      timeline: {
        ...timeline,
        kind: timeline.kind ?? "single_date",
        startDate: dateKey ?? timeline.startDate,
        timelineRole: "event",
        tense: "future",
        confidence: Math.max(timeline.confidence ?? 0, 0.88),
        needsConfirmation: false,
      },
    };
  }

  const needsToday =
    !timeline.startDate &&
    !timeline.deadlineDate &&
    (timeline.tense === "past" ||
      plan.category === "workout" ||
      /\b(went|worked)\b/i.test(plan.prompt));

  if (needsToday) {
    const todayKey = toDateKey(reference);
    const isLog =
      timeline.tense === "past" ||
      plan.category === "workout" ||
      plan.category === "workday";

    return {
      ...plan,
      dateLabel: "Today",
      timeline: {
        ...timeline,
        kind: "relative",
        startDate: todayKey,
        timelineRole: isLog ? "log" : timeline.timelineRole,
        label: "Today",
        tense: timeline.tense === "unknown" ? "past" : timeline.tense,
        confidence: Math.max(timeline.confidence ?? 0, 0.85),
        needsConfirmation: false,
      },
    };
  }

  if (
    plan.category === "workday" &&
    timeline.startDate &&
    (timeline.tense === "past" || /\bworked\b/i.test(plan.prompt))
  ) {
    return {
      ...plan,
      timeline: {
        ...timeline,
        timelineRole: "log",
      },
    };
  }

  if (
    plan.category === "workout" &&
    timeline.startDate &&
    timeline.tense === "past"
  ) {
    return {
      ...plan,
      timeline: {
        ...timeline,
        timelineRole: "log",
      },
    };
  }

  return plan;
}

function buildPreviewContext(context: CapturePipelineContext) {
  const profile = loadUserProfile();
  return {
    mode: context.previewMode ?? ("create" as const),
    selectedDestinations: context.selectedDestinations,
    userContext: profileToSyncUserContext(profile, context.workSchedule),
    calendarItems: context.items,
    workSchedule: context.workSchedule ?? undefined,
    excludeCaptureId: context.excludeCaptureId,
    targetTitle: context.targetTitle,
  };
}

export function prepareCaptureFromText(
  text: string,
  context: CapturePipelineContext,
): PreparedCapture | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const reference = context.reference ?? new Date();
  const rawPlan = createPulsePlan(trimmed, {
    timeline: { now: reference },
    categoryHint: context.categoryHint,
  });
  const plan = enrichCapturePlan(rawPlan, reference);
  return prepareCaptureFromPlan(plan, context);
}

export function prepareCaptureFromPlan(
  plan: PulsePlan,
  context: CapturePipelineContext,
): PreparedCapture {
  const preview = buildSyncPreviewViewModel(plan, buildPreviewContext(context));
  const destinations = sanitizeSyncDestinations(
    context.selectedDestinations?.length
      ? context.selectedDestinations
      : preview.where.destinations,
  );
  const title = context.targetTitle ?? compactCaptureTitle(plan);
  const duplicate = detectDuplicateCapture(plan, title, context.items);

  return {
    plan,
    preview,
    destinations,
    title,
    meaning: preview.meaning,
    duplicate,
  };
}

export function isSilentCaptureReady(
  prepared: PreparedCapture,
): boolean {
  if (prepared.preview.readyToSave) {
    return true;
  }

  const { plan, destinations } = prepared;
  if (destinations.length === 0) return false;

  const timeline = plan.timeline;
  if (!timeline) return false;

  const confidence = timeline.confidence ?? 0;

  if (
    timeline.kind === "recurring" &&
    timeline.recurrence &&
    confidence >= 0.7
  ) {
    return true;
  }

  if (plan.parsedInput?.workAvailability === "off" && timeline.startDate) {
    return true;
  }

  const hasDate = Boolean(timeline.startDate || timeline.deadlineDate);

  if (timeline.timelineRole === "deadline" && hasDate && confidence >= 0.7) {
    return true;
  }

  if (timeline.timelineRole === "log" && hasDate) {
    return true;
  }

  if (
    timeline.tense === "past" &&
    (plan.category === "workout" || plan.category === "workday")
  ) {
    return true;
  }

  if (hasDate && confidence >= 0.7) {
    return true;
  }

  return false;
}

export function saveCapture(
  prepared: PreparedCapture,
  addCapturedItem: (
    plan: PulsePlan & { status: "saved" },
    destinations: SyncDestination[],
    title?: string,
    extras?: {
      meaning?: MeaningAnalysis;
      protectedTime?: CapturedSyncItem["protectedTime"];
      understanding?: string;
    },
  ) => CapturedSyncItem,
  options?: {
    protectTime?: boolean;
    skipDuplicateCheck?: boolean;
  },
): SavedCaptureResult | null {
  const { plan, destinations, title, meaning, duplicate } = prepared;
  if (destinations.length === 0) return null;

  const now = new Date().toISOString();
  const protectedTime = options?.protectTime
    ? {
        enabled: true,
        reason: meaning.protection.reason ?? "Protected by you",
        createdAt: now,
      }
    : undefined;

  const understanding = buildMemoryUnderstanding({
    title,
    prompt: plan.prompt,
    originalPrompt: plan.originalPrompt,
    destinations,
    timeline: plan.timeline,
    category: plan.category,
    workAvailability: plan.parsedInput?.workAvailability,
    moneyType: plan.parsedInput?.moneyType,
  });

  const item = addCapturedItem(
    { ...plan, status: "saved" },
    destinations,
    title,
    { meaning, protectedTime, understanding },
  );

  return {
    plan: { ...plan, status: "saved" },
    destinations,
    title,
    meaning,
    item,
    duplicate: options?.skipDuplicateCheck
      ? { isDuplicate: false, matches: [], bestMatch: null }
      : duplicate,
  };
}
