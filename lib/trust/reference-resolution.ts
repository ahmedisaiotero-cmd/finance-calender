import type { CapturedSyncItem } from "@/lib/captured-items";
import { titleSimilarity } from "@/lib/capture-duplicate-detection";
import type { MeaningImportance } from "@/lib/intelligence/meaning-engine";
import type { SyncTimeBlockArea, SyncTimeBlockType } from "@/lib/sync-time-blocks";
import {
  detectSyncCommandIntent,
  type SyncCommandIntent,
} from "@/lib/sync-command-intent";

export type ReferenceResolution = {
  status: "resolved" | "multiple_matches" | "not_found";
  target?: CapturedSyncItem;
  candidates?: CapturedSyncItem[];
  reason?: string;
};

type ResolveCaptureReferenceInput = {
  commandText: string;
  items: CapturedSyncItem[];
  now?: Date;
};

const STRONG_MATCH_THRESHOLD = 0.52;
const RESOLVED_GAP = 0.14;

function activeItems(items: CapturedSyncItem[]) {
  return items.filter((item) => item.status !== "cancelled" && !item.deletedAt);
}

function normalized(value?: string) {
  return value?.toLowerCase().replace(/\s+/g, " ").trim() ?? "";
}

function weekdayFromDateKey(dateKey?: string) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
  });
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

function destinationBoost(query: string, item: CapturedSyncItem) {
  const text = normalized(query);
  let boost = 0;

  if (/\b(doctor|dentist|appointment|medical)\b/.test(text)) {
    if (item.destinations.includes("Health")) boost += 0.12;
    if (/\bdoctor\b/.test(normalized(item.title + " " + item.prompt))) boost += 0.16;
    if (/\bdentist\b/.test(normalized(item.title + " " + item.prompt))) boost += 0.16;
  }

  if (/\b(dinner|date|girlfriend|boyfriend)\b/.test(text)) {
    if (item.destinations.includes("Relationships") || item.category === "date-night") {
      boost += 0.1;
    }
  }

  if (/\b(gym|workout)\b/.test(text)) {
    if (item.destinations.includes("Health") || item.category === "workout") {
      boost += 0.1;
    }
  }

  if (/\b(family|daughter|son|mom|dad)\b/.test(text)) {
    if (item.destinations.includes("Family")) boost += 0.12;
  }

  return boost;
}

function recencyBoost(item: CapturedSyncItem, now: Date) {
  const updated = new Date(item.updatedAt).getTime();
  const ageDays = (now.getTime() - updated) / (1000 * 60 * 60 * 24);
  if (ageDays <= 2) return 0.08;
  if (ageDays <= 7) return 0.04;
  return 0;
}

function referenceScore(
  query: string,
  item: CapturedSyncItem,
  commandIntent: Exclude<SyncCommandIntent, { type: "create" }>,
  now: Date,
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

  score += destinationBoost(query, item);
  score += recencyBoost(item, now);

  if (item.protectedTime?.enabled) {
    score += 0.04;
  }

  return Math.min(score, 1);
}

function formatCandidateLabel(item: CapturedSyncItem) {
  const when = [item.dateLabel, item.timeLabel]
    .filter((value) => value && value !== "Flexible" && value !== "Upcoming")
    .join(" · ");
  return when ? `${item.title} · ${when}` : item.title;
}

export function resolveCaptureReference(
  input: ResolveCaptureReferenceInput,
): ReferenceResolution {
  const commandIntent = detectSyncCommandIntent(input.commandText);
  const now = input.now ?? new Date();

  if (commandIntent.type === "create") {
    return {
      status: "not_found",
      reason: "No edit or delete command detected.",
    };
  }

  const query = commandIntent.targetText;
  const matches = activeItems(input.items)
    .map((item) => ({
      item,
      score: referenceScore(query, item, commandIntent, now),
    }))
    .filter((entry) => entry.score >= STRONG_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return {
      status: "not_found",
      reason: "I couldn't find a matching item.",
    };
  }

  const top = matches[0];
  const closeMatches = matches.filter(
    (entry) => top.score - entry.score <= RESOLVED_GAP,
  );

  if (closeMatches.length > 1) {
    return {
      status: "multiple_matches",
      candidates: closeMatches.map((entry) => entry.item),
      reason: "Multiple items could match. Which one did you mean?",
    };
  }

  return {
    status: "resolved",
    target: top.item,
    candidates: [top.item],
  };
}

export function formatReferenceCandidateLabel(item: CapturedSyncItem) {
  return formatCandidateLabel(item);
}
