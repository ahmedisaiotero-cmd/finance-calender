import type { CapturedSyncItem } from "@/lib/captured-items";
import { analyzeMeaning } from "@/lib/intelligence/meaning-engine";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import { sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { PulsePlan, PulsePlanCategory, PulseMoneyType } from "@/lib/pulse/types";
import {
  detectSyncTimeBlockOverlaps,
  proposedSyncTimeBlocksFromPlan,
} from "@/lib/sync-time-blocks";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

function compactTitle(plan: {
  category: PulsePlanCategory;
  timeLabel: string;
  title: string;
  parsedInput?: PulsePlan["parsedInput"];
  moneyType?: PulseMoneyType;
}): string {
  if (plan.parsedInput?.moneyType === "income" || plan.moneyType === "income") {
    return "Upcoming Paycheck";
  }

  if (plan.category === "workout" && plan.timeLabel !== "Flexible") {
    return `${plan.timeLabel} Workout`;
  }

  if (plan.category === "reminder") {
    return plan.title.replace(/\s+Reminder$/i, "");
  }

  if (plan.category === "savings-goal") {
    return plan.title.replace(/\s+Savings Goal$/i, " Goal");
  }

  return plan.title;
}

export function captureFromBriefInput(
  text: string,
  context: {
    items: CapturedSyncItem[];
    workSchedule?: PersistedWorkSchedule | null;
    reference?: Date;
  },
) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const reference = context.reference ?? new Date();
  const plan = createPulsePlan(trimmed, { timeline: { now: reference } });
  const preview = buildSyncPreviewViewModel(plan, {
    calendarItems: context.items,
    workSchedule: context.workSchedule ?? undefined,
  });

  const destinations = sanitizeSyncDestinations(preview.where.destinations);
  if (destinations.length === 0 || !preview.readyToSave) {
    return null;
  }

  const overlaps = detectSyncTimeBlockOverlaps({
    plan,
    items: context.items,
    workSchedule: context.workSchedule ?? undefined,
  });

  const meaning = analyzeMeaning({
    title: compactTitle(plan),
    normalizedText: plan.prompt,
    category: plan.category,
    destinations,
    timeline: plan.timeline,
    timeBlocks: proposedSyncTimeBlocksFromPlan(plan),
    overlaps: overlaps.length > 0 ? overlaps : undefined,
    items: context.items,
  });

  return {
    plan: { ...plan, status: "saved" as const },
    destinations,
    title: compactTitle(plan),
    meaning,
  };
}
