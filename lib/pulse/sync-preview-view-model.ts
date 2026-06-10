import type { SyncDestination } from "@/lib/captured-items";
import {
  analyzeConsequences,
  type ConsequenceAnalysis,
} from "@/lib/intelligence/consequence-engine";
import type { SyncUserContext } from "@/lib/intelligence/sync-user-context";
import { titleCaseKeep } from "@/lib/pulse/parse-pulse-prompt";
import { getSyncPreviewThought } from "@/lib/pulse/preview-copy";
import { resolveSyncDestinations, sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { PulseMoneyType, PulsePlan, PulsePlanCategory } from "@/lib/pulse/types";

export type SyncPreviewTimelineRole =
  | "event"
  | "task"
  | "deadline"
  | "log"
  | "schedule"
  | "unknown";

export type SyncPreviewViewModel = {
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
  };
  where: {
    destinations: SyncDestination[];
  };
  why: {
    summary?: string;
    affectedAreas: {
      area: string;
      impact: "positive" | "negative" | "neutral" | "unknown";
      reason: string;
    }[];
    suggestedActions?: {
      label: string;
      requiresConfirmation: boolean;
    }[];
  };
  confidence: {
    score: number;
    label: "high" | "medium" | "low";
    needsConfirmation: boolean;
  };
};

const CATEGORY_LABELS: Record<PulsePlanCategory, string> = {
  workout: "Workout",
  workday: "Workday",
  "date-night": "Date Night",
  subscription: "Subscription",
  expense: "Expense",
  reminder: "Reminder",
  "savings-goal": "Savings Goal",
  task: "Task",
  general: "General",
};

const TIMELINE_ROLE_LABELS: Record<SyncPreviewTimelineRole, string> = {
  event: "Event",
  task: "Task",
  deadline: "Deadline",
  log: "Log",
  schedule: "Schedule",
  unknown: "Timeline",
};

type BuildSyncPreviewOptions = {
  selectedDestinations?: SyncDestination[];
  userContext?: SyncUserContext;
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

function buildWhySummary(
  plan: PulsePlan,
  analysis: ConsequenceAnalysis | null,
): string {
  const text = plan.prompt.toLowerCase();

  if (/\b(rent|bill)\b/.test(text) && /\b(due|by|before)\b/.test(text)) {
    return "Keeps an upcoming bill visible.";
  }

  if (analysis?.affectedAreas.length) {
    const health = analysis.affectedAreas.find((area) => area.area === "health");
    if (health && plan.category === "workout") return health.reason;

    const finance = analysis.affectedAreas.find((area) => area.area === "finance");
    if (finance && /\b(rent|bill|due)\b/.test(text)) {
      return "Keeps an upcoming bill visible.";
    }

    const calendar = analysis.affectedAreas.find((area) => area.area === "calendar");
    if (calendar) return calendar.reason;

    return analysis.affectedAreas[0].reason;
  }

  return getSyncPreviewThought(plan);
}

function resolveConfidence(plan: PulsePlan): SyncPreviewViewModel["confidence"] {
  const score = plan.timeline?.confidence ?? 0.5;
  const label = plan.timeline?.confidenceLabel ?? "medium";
  const needsConfirmation = plan.timeline?.needsConfirmation ?? false;

  return { score, label, needsConfirmation };
}

export function getDestinationChipLabels(
  preview: SyncPreviewViewModel,
): SyncDestination[] {
  return [...preview.where.destinations];
}

export function buildSyncPreviewViewModel(
  plan: PulsePlan,
  options: BuildSyncPreviewOptions = {},
): SyncPreviewViewModel {
  const resolvedDestinations = resolveSyncDestinations(plan);
  const destinations =
    resolvedDestinations.length > 0
      ? resolvedDestinations
      : sanitizeSyncDestinations(options.selectedDestinations ?? []);

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

  return {
    what: {
      title: buildPreviewTitle(plan),
      subtitle: buildPreviewSubtitle(plan),
      category: CATEGORY_LABELS[plan.category],
      intent: TIMELINE_ROLE_LABELS[timelineRole],
    },
    when: {
      label: resolveWhenLabel(plan),
      date: resolveWhenDate(plan),
      startTime,
      endTime,
      isTimed: Boolean(plan.timeline?.isTimed && (startTime || endTime)),
      timelineRole,
    },
    where: {
      destinations,
    },
    why: {
      summary: buildWhySummary(plan, consequenceAnalysis),
      affectedAreas: consequenceAnalysis.affectedAreas.map((area) => ({
        area: area.area,
        impact: area.impact,
        reason: area.reason,
      })),
      suggestedActions: consequenceAnalysis.suggestedActions.map((action) => ({
        label: action.label,
        requiresConfirmation: action.requiresConfirmation,
      })),
    },
    confidence: resolveConfidence(plan),
  };
}
