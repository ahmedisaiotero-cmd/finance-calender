import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import type { PulsePlan } from "@/lib/pulse/types";
import {
  detectSyncCommandIntent,
  type SyncCommandIntent,
} from "@/lib/sync-command-intent";
import { resolveCaptureReference } from "@/lib/trust/reference-resolution";
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


function formatClock(value?: string) {
  if (!value) return "";
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
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

export function resolveCaptureAction(
  text: string,
  items: CapturedSyncItem[],
): CaptureActionResolution {
  const commandIntent = detectSyncCommandIntent(text);

  if (commandIntent.type === "create") {
    return { intent: "create", query: text.trim(), commandIntent };
  }

  const reference = resolveCaptureReference({
    commandText: text,
    items,
  });

  const query = commandIntent.targetText;
  const targets = reference.candidates ?? (reference.target ? [reference.target] : []);
  const primaryTarget = reference.target ?? targets[0] ?? null;

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
  const restated = originalCommand.replace(/^(actually|wait,)[, ]*/i, "").trim();
  const plan = createPulsePlan(
    restated || [existing.title, dateLabel, timeLabel].filter(Boolean).join(" "),
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
    workAvailability:
      plan.parsedInput?.workAvailability ?? existing.workAvailability,
    timeline: plan.timeline,
    meaning: existing.meaning,
    protectedTime: existing.protectedTime,
    updatedAt: new Date().toISOString(),
  };
}
