import type { CapturedSyncItem } from "@/lib/captured-items";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { memoryFilterCategory } from "@/lib/mobile-prototype/memory-category";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { isMoneyLanguage } from "@/lib/sync-capture/surface-copy";
import {
  OBSERVATION_COFFEE_ROUTINE,
  OBSERVATION_FAMILY_RECENT,
  OBSERVATION_HEALTH_RECENT,
  OBSERVATION_MONEY_THEME,
  OBSERVATION_QUIET_WEEK,
  OBSERVATION_RELATIONSHIPS_RECENT,
  OBSERVATION_WORK_WEEK,
} from "@/lib/mobile-prototype/sync-voice";

export type LifeObservationCategory =
  | "work"
  | "money"
  | "health"
  | "family"
  | "relationships"
  | "routine"
  | "general";

export type LifeObservation = {
  text: string | null;
  sourceIds: string[];
  confidence: number;
  category: LifeObservationCategory | null;
};

export const DEFAULT_OBSERVATION_LOOKBACK_DAYS = 7;
export const DEFAULT_OBSERVATION_MIN_EVIDENCE = 3;

const BANNED_OBSERVATION =
  /\b(productive|great work|great job|should exercise|too much|stay on track|keep going|crush your goals|streak|\d+%|frequency increased|elevated|amazing|crushed it)\b/i;

type PatternBucket = {
  category: LifeObservationCategory;
  text: string;
  ids: string[];
};

function daysSince(iso: string, reference: Date) {
  const created = new Date(iso);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  created.setHours(12, 0, 0, 0);
  return Math.round((start.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
}

function memoryText(item: CapturedSyncItem) {
  const prompt = (item.originalPrompt ?? item.prompt).trim();
  return `${item.title} ${normalizeCaptureInput(prompt).normalized}`.toLowerCase();
}

function activeItems(items: CapturedSyncItem[]) {
  return items.filter(
    (item) => item.status !== "cancelled" && !item.deletedAt,
  );
}

function itemsInLookback(
  items: CapturedSyncItem[],
  reference: Date,
  lookbackDays: number,
) {
  return activeItems(items).filter(
    (item) => daysSince(item.createdAt, reference) <= lookbackDays,
  );
}

function confidenceForCount(count: number, minEvidence: number) {
  if (count < minEvidence) return 0;
  return Math.min(0.95, 0.45 + (count - minEvidence + 1) * 0.12);
}

function isWorkMemory(item: CapturedSyncItem, reference: Date) {
  const profile = buildMemoryProfile(item, reference);
  const text = memoryText(item);
  return (
    profile.area === "Work" ||
    item.category === "workday" ||
    item.category === "work-schedule" ||
    item.destinations.includes("Work") ||
    /\b(worked|working|work on|project|coded|coding|sync)\b/.test(text)
  );
}

function isHealthMemory(item: CapturedSyncItem, reference: Date) {
  const profile = buildMemoryProfile(item, reference);
  const text = memoryText(item);
  return (
    profile.area === "Health" ||
    item.category === "workout" ||
    /\b(workout|gym|exercise|run|cardio)\b/.test(text)
  );
}

function isMoneyMemory(item: CapturedSyncItem) {
  const text = memoryText(item);
  return memoryFilterCategory(item) === "Money" || isMoneyLanguage(text);
}

function isFamilyMemory(item: CapturedSyncItem, reference: Date) {
  const profile = buildMemoryProfile(item, reference);
  const text = memoryText(item);
  return (
    profile.area === "Family" ||
    item.destinations.includes("Family") ||
    /\b(daughter|son|mom|dad|mother|father|school drop|take .* to school)\b/.test(
      text,
    )
  );
}

function isRelationshipMemory(item: CapturedSyncItem, reference: Date) {
  const profile = buildMemoryProfile(item, reference);
  const text = memoryText(item);
  return (
    profile.area === "Relationships" ||
    item.destinations.includes("Relationships") ||
    /\b(friend|girlfriend|boyfriend|partner|anniversary|birthday)\b/.test(text)
  );
}

function isCoffeeMemory(item: CapturedSyncItem) {
  return /\bcoffee\b/i.test(memoryText(item));
}

function isMeaningful(item: CapturedSyncItem, items: CapturedSyncItem[], reference: Date) {
  return effectiveMemoryWeight(item, items, reference) !== "light";
}

export function isValidObservationCopy(text: string) {
  return !BANNED_OBSERVATION.test(text);
}

function buildPatternBuckets(
  recent: CapturedSyncItem[],
  allItems: CapturedSyncItem[],
  reference: Date,
  minEvidence: number,
): PatternBucket[] {
  const buckets: PatternBucket[] = [];

  const work = recent.filter((item) => isWorkMemory(item, reference));
  if (work.length >= minEvidence) {
    buckets.push({
      category: "work",
      text: OBSERVATION_WORK_WEEK,
      ids: work.map((item) => item.id),
    });
  }

  const health = recent.filter((item) => isHealthMemory(item, reference));
  if (health.length >= minEvidence) {
    buckets.push({
      category: "health",
      text: OBSERVATION_HEALTH_RECENT,
      ids: health.map((item) => item.id),
    });
  }

  const money = recent.filter((item) => isMoneyMemory(item));
  if (money.length >= minEvidence) {
    buckets.push({
      category: "money",
      text: OBSERVATION_MONEY_THEME,
      ids: money.map((item) => item.id),
    });
  }

  const family = recent.filter((item) => isFamilyMemory(item, reference));
  if (family.length >= minEvidence) {
    buckets.push({
      category: "family",
      text: OBSERVATION_FAMILY_RECENT,
      ids: family.map((item) => item.id),
    });
  }

  const relationships = recent.filter((item) =>
    isRelationshipMemory(item, reference),
  );
  if (relationships.length >= minEvidence) {
    buckets.push({
      category: "relationships",
      text: OBSERVATION_RELATIONSHIPS_RECENT,
      ids: relationships.map((item) => item.id),
    });
  }

  const coffee = recent.filter((item) => isCoffeeMemory(item));
  if (coffee.length >= minEvidence) {
    buckets.push({
      category: "routine",
      text: OBSERVATION_COFFEE_ROUTINE,
      ids: coffee.map((item) => item.id),
    });
  }

  const meaningfulCount = recent.filter((item) =>
    isMeaningful(item, allItems, reference),
  ).length;

  if (
    recent.length > 0 &&
    meaningfulCount <= 1 &&
    buckets.length === 0 &&
    recent.length >= minEvidence
  ) {
    buckets.push({
      category: "general",
      text: OBSERVATION_QUIET_WEEK,
      ids: recent.map((item) => item.id),
    });
  }

  return buckets;
}

function pickStrongestPattern(buckets: PatternBucket[]) {
  if (buckets.length === 0) return null;

  const priority: LifeObservationCategory[] = [
    "work",
    "health",
    "money",
    "family",
    "relationships",
    "routine",
    "general",
  ];

  return buckets.sort((a, b) => {
    const countDiff = b.ids.length - a.ids.length;
    if (countDiff !== 0) return countDiff;
    return priority.indexOf(a.category) - priority.indexOf(b.category);
  })[0];
}

export function buildLifeObservation(input: {
  items: CapturedSyncItem[];
  consequences?: SyncConsequence[];
  reference?: Date;
  lookbackDays?: number;
  minEvidence?: number;
}): LifeObservation {
  const reference = input.reference ?? new Date();
  const lookbackDays = input.lookbackDays ?? DEFAULT_OBSERVATION_LOOKBACK_DAYS;
  const minEvidence = input.minEvidence ?? DEFAULT_OBSERVATION_MIN_EVIDENCE;
  const recent = itemsInLookback(input.items, reference, lookbackDays);

  if (recent.length < minEvidence) {
    return { text: null, sourceIds: [], confidence: 0, category: null };
  }

  const buckets = buildPatternBuckets(
    recent,
    input.items,
    reference,
    minEvidence,
  );
  const winner = pickStrongestPattern(buckets);

  if (!winner || !isValidObservationCopy(winner.text)) {
    return { text: null, sourceIds: [], confidence: 0, category: null };
  }

  return {
    text: winner.text,
    sourceIds: winner.ids.slice(0, 6),
    confidence: confidenceForCount(winner.ids.length, minEvidence),
    category: winner.category,
  };
}
