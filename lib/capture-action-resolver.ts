import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import { titleSimilarity } from "@/lib/capture-duplicate-detection";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import type { PulsePlan } from "@/lib/pulse/types";
import {
  detectSyncCommandIntent,
  type SyncCommandIntent,
} from "@/lib/sync-command-intent";
import type { ResolveTimelineOptions } from "@/lib/timeline/resolve-timeline";

export type CaptureActionIntent = "create" | "edit" | "delete";

export type CaptureActionResolution =
  | {
      intent: "create";
      query: string;
      commandIntent: Extract<SyncCommandIntent, { type: "create" }>;
    }
  | {
      intent: "edit";
      query: string;
      commandIntent: Extract<SyncCommandIntent, { type: "edit" }>;
      targets: CapturedSyncItem[];
      primaryTarget: CapturedSyncItem | null;
    }
  | {
      intent: "delete";
      query: string;
      commandIntent: Extract<SyncCommandIntent, { type: "delete" }>;
      targets: CapturedSyncItem[];
      primaryTarget: CapturedSyncItem | null;
    };

function activeItems(items: CapturedSyncItem[]) {
  return items.filter((item) => item.status !== "cancelled" && !item.deletedAt);
}

export function detectCaptureActionIntent(text: string): CaptureActionIntent {
  const intent = detectSyncCommandIntent(text);
  if (intent.type === "delete") return "delete";
  if (intent.type === "edit") return "edit";
  return "create";
}

export function extractActionQuery(text: string, intent: CaptureActionIntent): string {
  const commandIntent = detectSyncCommandIntent(text);
  if (intent === "delete" && commandIntent.type === "delete") {
    return commandIntent.targetText;
  }
  if (intent === "edit" && commandIntent.type === "edit") {
    return commandIntent.targetText;
  }
  return text.trim();
}

function weekdayFromDateKey(dateKey?: string) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function normalized(value?: string) {
  return value?.toLowerCase().replace(/\s+/g, " ").trim() ?? "";
}

function matchesDateLabel(item: CapturedSyncItem, label?: string) {
  if (!label) return false;
  const wanted = normalized(label);
  const timelineDate = item.timeline?.deadlineDate ?? item.timeline?.startDate;
  return [
    item.dateLabel,
    item.timeline?.label,
    weekdayFromDateKey(timelineDate) ?? undefined,
  ].some((value) => normalized(value) === wanted);
}

function targetScore(
  query: string,
  item: CapturedSyncItem,
  commandIntent: Exclude<SyncCommandIntent, { type: "create" }>,
) {
  const target = normalized(query);
  let score = Math.max(
    titleSimilarity(query, item.title),
    titleSimilarity(query, item.prompt),
  );

  if (
    target === "it" ||
    target === "the duplicate" ||
    (target === "date" &&
      (item.category === "date-night" || normalized(item.title).includes("date")))
  ) {
    score = Math.max(score, 0.72);
  }

  if (
    commandIntent.type === "edit" &&
    matchesDateLabel(item, commandIntent.fromDateLabel)
  ) {
    score += 0.24;
  }

  if (
    commandIntent.type === "delete" &&
    /\bduplicate\b/i.test(commandIntent.targetText)
  ) {
    score = Math.max(score, 0.5);
  }

  return score;
}

function formatClock(value?: string) {
  if (!value) return "";
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

export function resolveCaptureAction(
  text: string,
  items: CapturedSyncItem[],
): CaptureActionResolution {
  const commandIntent = detectSyncCommandIntent(text);

  if (commandIntent.type === "create") {
    return { intent: "create", query: text.trim(), commandIntent };
  }

  const query = commandIntent.targetText;
  const matches = activeItems(items)
    .map((item) => ({
      item,
      score: targetScore(query, item, commandIntent),
    }))
    .filter((entry) => entry.score >= 0.45)
    .sort((a, b) => b.score - a.score);

  const targets = matches.map((entry) => entry.item);
  const primaryTarget = targets[0] ?? null;

  if (commandIntent.type === "edit") {
    return { intent: "edit", query, commandIntent, targets, primaryTarget };
  }

  return { intent: "delete", query, commandIntent, targets, primaryTarget };
}

export function buildEditPlanFromCommand(
  existing: CapturedSyncItem,
  commandIntent: Extract<SyncCommandIntent, { type: "edit" }>,
  originalCommand: string,
  timeline?: ResolveTimelineOptions,
): PulsePlan {
  const dateLabel = commandIntent.toDateLabel ?? existing.dateLabel;
  const startTime = commandIntent.toTime ?? existing.timeline?.startTime;
  const timeLabel = startTime ? formatClock(startTime) : "";
  const plan = createPulsePlan(
    [existing.title, dateLabel, timeLabel].filter(Boolean).join(" "),
    { timeline },
  );

  return {
    ...plan,
    originalPrompt: originalCommand,
  };
}

export function buildUpdatedCaptureFromPlan(
  existing: CapturedSyncItem,
  plan: PulsePlan,
  destinations: SyncDestination[],
  title: string,
): CapturedSyncItem {
  return {
    ...existing,
    title,
    category: plan.category,
    prompt: plan.prompt,
    originalPrompt: plan.originalPrompt,
    normalizationCorrections: plan.normalizationCorrections,
    destinations,
    dateLabel: plan.dateLabel,
    timeLabel: plan.timeLabel,
    amount: plan.parsedInput?.amount ?? existing.amount ?? null,
    frequency: plan.parsedInput?.frequency ?? existing.frequency,
    moneyType: plan.parsedInput?.moneyType ?? existing.moneyType,
    timeline: plan.timeline,
    updatedAt: new Date().toISOString(),
  };
}
