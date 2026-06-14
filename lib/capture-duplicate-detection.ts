import type { CapturedSyncItem } from "@/lib/captured-items";
import type { PulsePlan } from "@/lib/pulse/types";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";

export type DuplicateMatch = {
  item: CapturedSyncItem;
  score: number;
  reasons: string[];
};

export type DuplicateDetectionResult = {
  isDuplicate: boolean;
  matches: DuplicateMatch[];
  bestMatch: DuplicateMatch | null;
};

const DUPLICATE_THRESHOLD = 0.72;

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+reminder$/i, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleSimilarity(a: string, b: string): number {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  if (left.includes(right) || right.includes(left)) {
    return 0.88;
  }

  const leftWords = new Set(left.split(" "));
  const rightWords = new Set(right.split(" "));
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return union > 0 ? overlap / union : 0;
}

function sameStartTime(plan: PulsePlan, item: CapturedSyncItem): boolean {
  const planTime = plan.timeline?.startTime ?? plan.timeline?.deadlineTime;
  const itemTime = item.timeline?.startTime ?? item.timeline?.deadlineTime;
  if (!planTime || !itemTime) return false;
  return planTime === itemTime;
}

function sameTimelineRole(plan: PulsePlan, item: CapturedSyncItem): boolean {
  if (!plan.timeline?.timelineRole || !item.timeline?.timelineRole) return false;
  return plan.timeline.timelineRole === item.timeline.timelineRole;
}

export function detectDuplicateCapture(
  plan: PulsePlan,
  title: string,
  items: CapturedSyncItem[],
  reference = new Date(),
): DuplicateDetectionResult {
  const planDate = plan.timeline?.deadlineDate ?? plan.timeline?.startDate ?? null;
  const activeItems = items.filter(
    (item) => item.status !== "cancelled" && !item.deletedAt,
  );

  const matches: DuplicateMatch[] = [];

  for (const item of activeItems) {
    const reasons: string[] = [];
    let score = 0;

    const similarity = titleSimilarity(title, item.title);
    if (similarity >= 0.6) {
      score += similarity * 0.55;
      reasons.push("similar title");
    }

    const itemDate = resolveCaptureDateKey(item, reference);
    if (planDate && itemDate && planDate === itemDate) {
      score += 0.25;
      reasons.push("same date");
    }

    if (sameStartTime(plan, item)) {
      score += 0.12;
      reasons.push("same start time");
    }

    if (sameTimelineRole(plan, item)) {
      score += 0.08;
      reasons.push("same timeline role");
    }

    if (score >= DUPLICATE_THRESHOLD) {
      matches.push({ item, score, reasons });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  const bestMatch = matches[0] ?? null;

  return {
    isDuplicate: bestMatch !== null,
    matches,
    bestMatch,
  };
}
