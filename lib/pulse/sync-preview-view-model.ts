import type { SyncDestination, CapturedSyncItem } from "@/lib/captured-items";
import {
  analyzeMeaning,
  buildWhySummaryFromMeaning,
  type MeaningAnalysis,
  type MeaningSuggestedAction,
} from "@/lib/intelligence/meaning-engine";
import { buildPriorityConflictOverlap } from "@/lib/trust/conflict-priority";
import {
  humanizeMeaningSummary,
  humanizeProtectionReason,
} from "@/lib/trust/human-language";
import {
  detectSyncTimeBlockOverlaps,
  proposedSyncTimeBlocksFromPlan,
  type SyncTimeBlockOverlap,
} from "@/lib/sync-time-blocks";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { analyzeConsequences } from "@/lib/intelligence/consequence-engine";
import { classifyLifeNote } from "@/lib/intelligence/life-note-classifier";
import type { SyncUserContext } from "@/lib/intelligence/sync-user-context";
import { titleCaseKeep } from "@/lib/pulse/parse-pulse-prompt";
import { resolveSyncDestinations, sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { PulsePlan } from "@/lib/pulse/types";

export type SyncPreviewTimelineRole =
  | "event"
  | "task"
  | "deadline"
  | "log"
  | "schedule"
  | "unknown";

export type SyncPreviewMode =
  | "create"
  | "edit"
  | "delete"
  | "duplicate"
  | "schedule-save"
  | "schedule-delete"
  | "schedule-update";

export type SyncPreviewViewModel = {
  mode: SyncPreviewMode;
  banner?: string;
  readyToSave: boolean;
  what: {
    title: string;
    subtitle?: string;
    category: string;
    intent?: string;
  };
  when: {
    label: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    isTimed: boolean;
    timelineRole: SyncPreviewTimelineRole;
    overlap?: SyncTimeBlockOverlap;
  };
  where: {
    destinations: SyncDestination[];
  };
  why: {
    summary?: string;
    importanceLabel?: string;
    protectionRecommendation?: string;
    affectedAreas: {
      area: string;
      impact: "positive" | "negative" | "neutral" | "unknown";
      reason: string;
    }[];
    suggestedActions?: {
      id: string;
      label: string;
      actionType: MeaningSuggestedAction["actionType"];
      requiresConfirmation: boolean;
    }[];
  };
  meaning?: MeaningAnalysis;
  confidence: {
    score: number;
    label: "high" | "medium" | "low";
    needsConfirmation: boolean;
  };
};

type BuildSyncPreviewOptions = {
  mode?: SyncPreviewMode;
  selectedDestinations?: SyncDestination[];
  userContext?: SyncUserContext;
  targetTitle?: string;
  calendarItems?: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  excludeCaptureId?: string;
  reference?: Date;
};

function formatClock(value?: string) {
  if (!value) return undefined;
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${meridiem}`;
}

function buildPreviewTitle(plan: PulsePlan): string {
  if (plan.parsedInput?.moneyType === "income") {
    return "Upcoming Paycheck";
  }

  if (plan.category === "reminder") {
    const stripped = plan.title.replace(/\s+Reminder$/i, "");
    if (stripped !== "Reminder") return stripped;

    const dueMatch = plan.prompt.match(
      /^([A-Za-z0-9][A-Za-z0-9 &'+.-]*?)\s+due\b/i,
    );
    if (dueMatch) return titleCaseKeep(dueMatch[1].trim());
  }

  if (plan.category === "savings-goal") {
    return plan.title.replace(/\s+Savings Goal$/i, " Goal");
  }

  if (plan.category === "workout") {
    const derived = plan.title.replace(/\s+Session$/i, "").trim();
    if (derived && derived !== "Workout") return derived;
  }

  return plan.title;
}

function buildPreviewSubtitle(plan: PulsePlan): string | undefined {
  const amount = plan.parsedInput?.amount;
  if (!amount) return undefined;

  if (
    plan.parsedInput?.moneyType === "income" ||
    plan.category === "subscription" ||
    plan.category === "expense"
  ) {
    return amount;
  }

  return undefined;
}

function resolveWhenLabel(plan: PulsePlan): string {
  if (plan.timeline?.label && plan.timeline.label !== "Needs a timeline") {
    return plan.timeline.label;
  }
  if (plan.dateLabel && plan.dateLabel !== "Upcoming") {
    return plan.dateLabel;
  }
  return "Upcoming";
}

function resolveWhenDate(plan: PulsePlan): string | undefined {
  if (plan.timeline?.timelineRole === "deadline") {
    return plan.timeline.deadlineDate ?? plan.timeline.startDate;
  }
  return plan.timeline?.startDate ?? undefined;
}

function resolveTimelineRole(plan: PulsePlan): SyncPreviewTimelineRole {
  const role = plan.timeline?.timelineRole;
  if (!role) return "unknown";
  return role;
}

function resolvePreviewBanner(
  plan: PulsePlan,
  mode: SyncPreviewMode,
  readyToSave: boolean,
  destinations: SyncDestination[],
): string | undefined {
  if (mode === "schedule-delete") {
    return "Sync thinks you want to remove your standing work schedule.";
  }
  if (mode === "schedule-update") {
    return "Sync thinks you want to update your work schedule.";
  }
  if (mode === "schedule-save") {
    return "This will become standing context for your week.";
  }
  if (mode === "delete") {
    return "Sync thinks you want to remove this.";
  }
  if (mode === "edit") {
    return "Sync thinks you want to update this.";
  }
  if (mode === "duplicate") {
    return "This looks similar to an existing item.";
  }
  if (readyToSave) {
    return "Ready to save.";
  }
  if (plan.timeline?.needsConfirmation) {
    return "Sync thinks you meant...";
  }
  if (destinations.length === 0) {
    return "Sync thinks you meant...";
  }
  return undefined;
}

function isReadyToSave(
  plan: PulsePlan,
  mode: SyncPreviewMode,
  destinations: SyncDestination[],
): boolean {
  if (
    mode === "schedule-save" ||
    mode === "schedule-update" ||
    mode === "schedule-delete"
  ) {
    return false;
  }

  if (mode !== "create") return false;

  const lifeNote = classifyLifeNote(plan.prompt);
  if (
    destinations.length > 0 &&
    (lifeNote?.kind === "financial_state" || lifeNote?.kind === "no_plan")
  ) {
    return true;
  }

  const score = plan.timeline?.confidence ?? 0;
  const hasDate = Boolean(
    plan.timeline?.startDate || plan.timeline?.deadlineDate,
  );
  const hasTime = Boolean(
    plan.timeline?.isTimed &&
      (plan.timeline.startTime || plan.timeline.deadlineTime),
  );
  const hasDestination = destinations.length > 0;
  const isStructurallyClear =
    hasDate &&
    hasDestination &&
    (hasTime || plan.timeline?.timelineRole === "deadline");

  return score >= 0.9 && isStructurallyClear;
}

function resolveConfidence(plan: PulsePlan): SyncPreviewViewModel["confidence"] {
  const score = plan.timeline?.confidence ?? 0.5;
  const label = plan.timeline?.confidenceLabel ?? "medium";
  const needsConfirmation = plan.timeline?.needsConfirmation ?? false;

  return { score, label, needsConfirmation };
}

function resolveDisplayNeedsConfirmation(
  plan: PulsePlan,
  mode: SyncPreviewMode,
  readyToSave: boolean,
): boolean {
  if (
    mode === "schedule-save" ||
    mode === "schedule-update" ||
    mode === "schedule-delete"
  ) {
    return true;
  }
  if (readyToSave) return false;
  if (mode !== "create") return true;
  return plan.timeline?.needsConfirmation ?? false;
}

export function getDestinationChipLabels(
  preview: SyncPreviewViewModel,
): SyncDestination[] {
  return [...preview.where.destinations];
}

function resolvePreviewMode(
  plan: PulsePlan,
  mode: SyncPreviewMode,
): SyncPreviewMode {
  if (mode !== "create") return mode;
  if (plan.category === "work-schedule" && plan.timeline?.kind === "recurring") {
    return "schedule-save";
  }
  return mode;
}

export function buildSyncPreviewViewModel(
  plan: PulsePlan,
  options: BuildSyncPreviewOptions = {},
): SyncPreviewViewModel {
  const requestedMode = options.mode ?? "create";
  const mode = resolvePreviewMode(plan, requestedMode);
  const resolvedDestinations = resolveSyncDestinations(plan);
  const destinations =
    resolvedDestinations.length > 0
      ? resolvedDestinations
      : sanitizeSyncDestinations(options.selectedDestinations ?? []);
  const readyToSave = isReadyToSave(plan, mode, destinations);
  const confidence = resolveConfidence(plan);

  const consequenceAnalysis = analyzeConsequences({
    captureText: plan.prompt,
    category: plan.category,
    destinations,
    timeline: plan.timeline,
    userContext: options.userContext,
  });

  const timelineRole = resolveTimelineRole(plan);
  const startTime = formatClock(
    plan.timeline?.timelineRole === "deadline"
      ? plan.timeline.deadlineTime
      : plan.timeline?.startTime,
  );
  const endTime = formatClock(plan.timeline?.endTime);

  const rawOverlap =
    mode !== "delete" &&
    mode !== "schedule-delete" &&
    destinations.includes("Calendar") &&
    options.calendarItems
      ? detectSyncTimeBlockOverlaps({
          plan,
          items: options.calendarItems,
          workSchedule: options.workSchedule,
          excludeCaptureId: options.excludeCaptureId,
        })[0]
      : undefined;

  const proposedBlocks = proposedSyncTimeBlocksFromPlan(plan);

  const meaning = analyzeMeaning({
    title: options.targetTitle ?? buildPreviewTitle(plan),
    normalizedText: plan.prompt,
    category: plan.category,
    destinations,
    timeline: plan.timeline,
    timeBlocks: proposedBlocks,
    overlaps: rawOverlap ? [rawOverlap] : undefined,
    items: options.calendarItems,
    reference: options.reference,
  });

  const conflictItem = rawOverlap?.conflictSourceItemId
    ? options.calendarItems?.find(
        (item) => item.id === rawOverlap.conflictSourceItemId,
      )
    : undefined;

  const overlap = rawOverlap
    ? buildPriorityConflictOverlap(
        rawOverlap,
        {
          meaning,
          prompt: plan.prompt,
          destinations,
        },
        conflictItem,
      )
    : undefined;

  const humanSummary = humanizeMeaningSummary(
    buildWhySummaryFromMeaning(meaning, overlap),
  );
  const humanProtection = humanizeProtectionReason(meaning, destinations);

  return {
    mode,
    banner: resolvePreviewBanner(plan, mode, readyToSave, destinations),
    readyToSave,
    what: {
      title: options.targetTitle ?? buildPreviewTitle(plan),
      subtitle: buildPreviewSubtitle(plan),
      category: "",
      intent: undefined,
    },
    when: {
      label: resolveWhenLabel(plan),
      date: resolveWhenDate(plan),
      startTime,
      endTime,
      isTimed: Boolean(plan.timeline?.isTimed && (startTime || endTime)),
      timelineRole,
      overlap,
    },
    where: {
      destinations,
    },
    why: {
      summary: humanSummary,
      importanceLabel: undefined,
      protectionRecommendation: humanProtection,
      affectedAreas: consequenceAnalysis.affectedAreas.map((area) => ({
        area: area.area,
        impact: area.impact,
        reason: area.reason,
      })),
      suggestedActions: meaning.suggestedActions.map((action) => ({
        id: action.id,
        label: action.label,
        actionType: action.actionType,
        requiresConfirmation: action.requiresConfirmation,
      })),
    },
    meaning,
    confidence: {
      ...confidence,
      needsConfirmation: resolveDisplayNeedsConfirmation(plan, mode, readyToSave),
    },
  };
}
