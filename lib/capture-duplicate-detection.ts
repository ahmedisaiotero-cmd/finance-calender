import type { CapturedSyncItem } from "@/lib/captured-items";
import type { PulsePlan } from "@/lib/pulse/types";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import {
  areMemoryDuplicates,
} from "@/lib/sync-capture/memory-dedup";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";

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

    const cleanTitle = displayMemoryTitle({
      title,
      prompt: plan.prompt,
      category: plan.category,
      parsedInput: plan.parsedInput,
      workAvailability: plan.parsedInput?.workAvailability,
    });

    const similarity = Math.max(
      titleSimilarity(title, item.title),
      titleSimilarity(cleanTitle, displayMemoryTitle(item)),
    );
    if (similarity >= 0.6) {
      score += similarity * 0.55;
      reasons.push("similar title");
    }

    const planPrompt = plan.originalPrompt ?? plan.prompt;
    const itemPrompt = item.originalPrompt ?? item.prompt;
    const promptMatch = titleSimilarity(
      planPrompt.toLowerCase().replace(/[^a-z0-9 ]/g, " "),
      itemPrompt.toLowerCase().replace(/[^a-z0-9 ]/g, " "),
    );
    if (promptMatch >= 0.72) {
      score += promptMatch * 0.35;
      reasons.push("similar input");
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

    const probe: CapturedSyncItem = {
      id: plan.id,
      title: cleanTitle,
      category: plan.category,
      prompt: planPrompt,
      originalPrompt: plan.originalPrompt,
      destinations: [],
      dateLabel: plan.dateLabel,
      timeLabel: plan.timeLabel,
      moneyType: plan.parsedInput?.moneyType,
      workAvailability: plan.parsedInput?.workAvailability,
      timeline: plan.timeline,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (areMemoryDuplicates(probe, item, reference)) {
      matches.push({
        item,
        score: Math.max(score, DUPLICATE_THRESHOLD),
        reasons: [...reasons, "duplicate memory"],
      });
      continue;
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
