import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  scoreImportance,
  type SyncImportance,
} from "@/lib/intelligence/importance-scoring";
import type { SyncTimeBlock, SyncTimeBlockOverlap } from "@/lib/sync-time-blocks";
import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";

export type MeaningImportance = SyncImportance;

export type MeaningActionType =
  | "protect_time"
  | "set_leave_reminder"
  | "adjust_work"
  | "reschedule_conflict"
  | "add_reminder"
  | "none";

export type MeaningSuggestedAction = {
  id: string;
  label: string;
  actionType: MeaningActionType;
  requiresConfirmation: boolean;
};

export type MeaningAnalysis = {
  importance: MeaningImportance;
  meaningLabel: string;
  summary: string;
  protection: {
    eligible: boolean;
    recommended: boolean;
    protected: boolean;
    reason?: string;
  };
  suggestedActions: MeaningSuggestedAction[];
};

export type ProtectedTimeState = {
  enabled: boolean;
  reason?: string;
  createdAt?: string;
};

type AnalyzeMeaningInput = {
  title: string;
  normalizedText: string;
  category: string;
  destinations: string[];
  timeline?: TimelineResolution;
  timeBlocks?: SyncTimeBlock[];
  overlaps?: SyncTimeBlockOverlap[];
  items?: CapturedSyncItem[];
};

const HIGH_IMPORTANCE_PATTERNS = [
  /\b(daughter|son|child|children|kids)\b/i,
  /\bfamily\b/i,
  /\b(mom|dad|mother|father|parents)\b/i,
  /\b(girlfriend|boyfriend|wife|husband|partner)\b/i,
  /\b(doctor|dentist|therapy|medical|hospital)\b/i,
  /\bappointment\b/i,
  /\binterview\b/i,
  /\bwedding\b/i,
  /\banniversary\b/i,
  /\bgraduation\b/i,
  /\bfuneral\b/i,
  /\bcourt\b/i,
  /\b(school event|recital|ceremony)\b/i,
];

const MEDIUM_IMPORTANCE_PATTERNS = [
  /\b(gym|workout|exercise|lift|run|cardio)\b/i,
  /\b(friends?|date night|date with)\b/i,
  /\b(project work|studying|study)\b/i,
  /\b(bill due|rent due|payday|pay day)\b/i,
  /\b(work shift|shift)\b/i,
];

const LOW_IMPORTANCE_PATTERNS = [
  /\b(groceries|grocery|errand|small errand)\b/i,
  /\b(casual note|general reminder)\b/i,
  /\bbuy\b/i,
];

function detectImportance(
  text: string,
  destinations: string[],
  timeline?: TimelineResolution,
  reference = new Date(),
): MeaningImportance {
  return scoreImportance({
    text,
    destinations,
    timeline,
    reference,
    baseImportance: LOW_IMPORTANCE_PATTERNS.some((pattern) => pattern.test(text.toLowerCase()))
      ? "low"
      : HIGH_IMPORTANCE_PATTERNS.some((pattern) => pattern.test(text.toLowerCase()))
        ? "high"
        : "medium",
  });
}

function buildMeaningLabel(
  importance: MeaningImportance,
  text: string,
  destinations: string[],
): string {
  if (importance === "critical") {
    if (/\b(flight|airport|travel)\b/i.test(text)) return "Early travel";
    if (/\b(daughter|son|school)\b/i.test(text)) return "Family morning commitment";
    if (/\brent\b/i.test(text)) return "Urgent bill";
    return "Needs attention soon";
  }

  if (importance === "high") {
    if (/\b(daughter|son|child|kids|family|mom|dad|parents)\b/i.test(text)) {
      return "Family commitment";
    }
    if (/\b(doctor|dentist|appointment|medical)\b/i.test(text)) {
      return "Health commitment";
    }
    if (/\b(interview|wedding|graduation|funeral|court)\b/i.test(text)) {
      return "Important commitment";
    }
    return "Important commitment";
  }

  if (importance === "medium") {
    if (destinations.includes("Relationships")) return "Connection";
    if (destinations.includes("Health")) return "Wellness";
    if (/\b(bill|rent|payday)\b/i.test(text)) return "Money timing";
    return "Worth keeping in view";
  }

  return "Light task";
}

function buildMeaningSummary(
  importance: MeaningImportance,
  text: string,
  destinations: string[],
): string {
  if (importance === "critical") {
    if (/\b(flight|airport|travel)\b/i.test(text)) {
      return "Sync remembers this because early travel tomorrow may need prep tonight.";
    }
    if (/\b(daughter|son|school)\b/i.test(text)) {
      return "Sync remembers this because it affects your morning availability tomorrow.";
    }
    if (/\brent\b/i.test(text)) {
      return "Sync remembers this because rent is due soon.";
    }
    return "Sync remembers this because it needs attention soon.";
  }

  if (importance === "high") {
    if (/\b(daughter|son|child|kids|family|mom|dad|parents|school)\b/i.test(text)) {
      return "This looks like an important family commitment.";
    }
    if (/\b(doctor|dentist|appointment|medical|hospital)\b/i.test(text)) {
      return "This looks like an important health commitment.";
    }
    if (/\b(interview|wedding|graduation|funeral|court)\b/i.test(text)) {
      return "This looks like something worth protecting on your calendar.";
    }
    return "This looks important enough to treat with care.";
  }

  if (importance === "medium") {
    if (destinations.includes("Relationships") || /\b(date|girlfriend|boyfriend)\b/i.test(text)) {
      return "This looks like a meaningful connection worth keeping clear.";
    }
    if (destinations.includes("Health") || /\b(gym|workout)\b/i.test(text)) {
      return "This supports your wellness rhythm.";
    }
    if (/\b(bill|rent|payday|groceries)\b/i.test(text)) {
      return "A practical item to keep on your radar.";
    }
    return "Worth a spot on your timeline when you are ready.";
  }

  return "A simple item to keep moving without much weight.";
}

function isTimedCommitment(
  timeline?: TimelineResolution,
  timeBlocks?: SyncTimeBlock[],
): boolean {
  if (timeBlocks?.some((block) => block.isTimed)) return true;
  return Boolean(timeline?.isTimed && (timeline.startTime || timeline.deadlineTime));
}

function overlapsWork(overlaps?: SyncTimeBlockOverlap[]): boolean {
  return (
    overlaps?.some(
      (overlap) =>
        overlap.existingTitle === "Work" ||
        overlap.existingArea === "work" ||
        /\bwork\b/i.test(overlap.existingTitle),
    ) ?? false
  );
}

function overlapsProtectedTime(
  overlaps?: SyncTimeBlockOverlap[],
  items?: CapturedSyncItem[],
): boolean {
  if (!overlaps?.length || !items?.length) return false;

  return overlaps.some((overlap) => {
    if (!overlap.conflictSourceItemId) return false;
    const item = items.find((entry) => entry.id === overlap.conflictSourceItemId);
    return item?.protectedTime?.enabled === true;
  });
}

function isEarlyMorning(timeline?: TimelineResolution): boolean {
  const start =
    timeline?.timelineRole === "deadline"
      ? timeline.deadlineTime
      : timeline?.startTime;
  if (!start) return false;
  const hour = Number(start.split(":")[0]);
  return !Number.isNaN(hour) && hour < 8;
}

function assessProtection(
  input: AnalyzeMeaningInput,
  importance: MeaningImportance,
): MeaningAnalysis["protection"] {
  const timed = isTimedCommitment(input.timeline, input.timeBlocks);
  const onCalendar = input.destinations.includes("Calendar");
  const text = input.normalizedText;

  const familyOrHealth =
    input.destinations.includes("Family") ||
    input.destinations.includes("Health") ||
    /\b(doctor|daughter|son|interview|wedding|funeral|court|appointment)\b/i.test(
      text,
    );

  const eligible =
    timed &&
    onCalendar &&
    importance !== "low" &&
    (importance === "high" || familyOrHealth || input.destinations.includes("Relationships"));

  const workConflict = overlapsWork(input.overlaps);
  const protectedConflict = overlapsProtectedTime(input.overlaps, input.items);

  const recommended =
    eligible &&
    (importance === "high" ||
      workConflict ||
      /\b(doctor|daughter|son|interview|wedding|funeral|court)\b/i.test(text) ||
      (input.destinations.includes("Relationships") &&
        /\b(date|girlfriend|boyfriend|anniversary)\b/i.test(text)));

  let reason: string | undefined;
  if (recommended) {
    if (workConflict && importance === "high") {
      reason = "You may want to protect this time or adjust work availability.";
    } else if (/\bdoctor|appointment\b/i.test(text)) {
      reason = "You may want to protect this time.";
    } else if (input.destinations.includes("Family")) {
      reason = "You may want to protect this time.";
    } else if (input.destinations.includes("Relationships")) {
      reason = "You may want to protect this time.";
    } else {
      reason = "You may want to protect this time.";
    }
  } else if (eligible) {
    reason = "You can protect this time if it starts to feel crowded.";
  }

  if (protectedConflict) {
    reason = "This bumps into time you already marked as protected.";
  }

  return {
    eligible,
    recommended,
    protected: false,
    reason,
  };
}

function buildSuggestedActions(
  input: AnalyzeMeaningInput,
  importance: MeaningImportance,
  protection: MeaningAnalysis["protection"],
): MeaningSuggestedAction[] {
  const actions: MeaningSuggestedAction[] = [];
  const workConflict = overlapsWork(input.overlaps);
  const protectedConflict = overlapsProtectedTime(input.overlaps, input.items);

  if (protection.recommended) {
    actions.push({
      id: "protect-time",
      label: "Protect this time",
      actionType: "protect_time",
      requiresConfirmation: true,
    });
  }

  if (
    isEarlyMorning(input.timeline) &&
    (input.destinations.includes("Family") || importance === "high")
  ) {
    actions.push({
      id: "leave-reminder",
      label: "Set leave reminder",
      actionType: "set_leave_reminder",
      requiresConfirmation: true,
    });
  }

  if (workConflict && importance === "high") {
    actions.push({
      id: "adjust-work",
      label: "Adjust work availability",
      actionType: "adjust_work",
      requiresConfirmation: true,
    });
  }

  if (protectedConflict && importance !== "high") {
    actions.push({
      id: "reschedule-conflict",
      label: "Consider rescheduling",
      actionType: "reschedule_conflict",
      requiresConfirmation: true,
    });
  }

  if (importance === "medium" && actions.length < 3) {
    actions.push({
      id: "add-reminder",
      label: "Add reminder",
      actionType: "add_reminder",
      requiresConfirmation: true,
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "none",
      label: "Save as-is",
      actionType: "none",
      requiresConfirmation: false,
    });
  }

  return actions.slice(0, 3);
}

export function analyzeMeaning(input: AnalyzeMeaningInput): MeaningAnalysis {
  if (input.category === "work-schedule") {
    return {
      importance: "medium",
      meaningLabel: "Work rhythm",
      summary:
        "This helps Sync understand when you usually work — it repeats weekly until you change it.",
      protection: {
        eligible: false,
        recommended: false,
        protected: false,
      },
      suggestedActions: [
        {
          id: "none",
          label: "Save as-is",
          actionType: "none",
          requiresConfirmation: false,
        },
      ],
    };
  }

  const importance = detectImportance(
    input.normalizedText,
    input.destinations,
    input.timeline,
  );
  const meaningLabel = buildMeaningLabel(
    importance,
    input.normalizedText,
    input.destinations,
  );
  const summary = buildMeaningSummary(
    importance,
    input.normalizedText,
    input.destinations,
  );
  const protection = assessProtection(input, importance);
  const suggestedActions = buildSuggestedActions(input, importance, protection);

  return {
    importance,
    meaningLabel,
    summary,
    protection,
    suggestedActions,
  };
}

export function enrichOverlapWithMeaning(
  overlap: SyncTimeBlockOverlap,
  meaning: MeaningAnalysis,
  conflictItem?: CapturedSyncItem,
): SyncTimeBlockOverlap {
  const isWork =
    conflictItem?.destinations.includes("Work") ||
    overlap.existingTitle === "Work" ||
    overlap.existingArea === "work";
  const isProtected = conflictItem?.protectedTime?.enabled === true;

  if (isProtected && meaning.importance !== "high") {
    return {
      ...overlap,
      severity: "important",
      existingProtected: true,
      headline: "This overlaps with protected time.",
      conflictMeaning: "Consider rescheduling.",
    };
  }

  if (isWork && meaning.importance === "high") {
    return {
      ...overlap,
      severity: "important",
      headline: "This overlaps with Work, but this looks important.",
      conflictMeaning:
        "You may need to protect this time or adjust work availability.",
    };
  }

  if (isProtected) {
    return {
      ...overlap,
      severity: "important",
      existingProtected: true,
      headline: "This overlaps with protected time.",
      conflictMeaning:
        "You may need to protect this time or adjust work availability.",
    };
  }

  return {
    ...overlap,
    severity: meaning.importance === "high" ? "important" : "notice",
  };
}

export function buildWhySummaryFromMeaning(
  meaning: MeaningAnalysis,
  overlap?: SyncTimeBlockOverlap,
): string {
  const parts = [meaning.summary];

  if (overlap) {
    parts.push(overlap.headline);
    if (overlap.conflictMeaning) {
      parts.push(overlap.conflictMeaning);
    }
  } else if (meaning.protection.recommended && meaning.protection.reason) {
    parts.push(meaning.protection.reason);
  }

  return parts.filter(Boolean).join(" ");
}
