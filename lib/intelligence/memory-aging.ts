import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import {
  itemsInSameThread,
  resolveMemoryThread,
} from "@/lib/intelligence/memory-thread";
import {
  maxMemoryWeight,
  scoreMemoryWeight,
  type MemoryWeight,
} from "@/lib/intelligence/memory-weight";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";

export type MemoryVisibility = "prominent" | "normal" | "fading" | "hidden";

const LIGHT_FADE_DAYS = 10;
const LIGHT_HIDE_DAYS = 21;

function daysSinceCreated(item: CapturedSyncItem, reference: Date) {
  const created = new Date(item.createdAt);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  created.setHours(12, 0, 0, 0);
  return Math.round((start.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
}

function memoryText(item: CapturedSyncItem) {
  const prompt = (item.originalPrompt ?? item.prompt).trim();
  return `${item.title} ${normalizeCaptureInput(prompt).normalized}`.toLowerCase();
}

export function effectiveMemoryWeight(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference = new Date(),
): MemoryWeight {
  const base = scoreMemoryWeight(item, reference);
  const profile = buildMemoryProfile(item, reference);
  const thread = resolveMemoryThread(profile, memoryText(item));
  const siblings = itemsInSameThread(item, items, reference);
  const recent = [item, ...siblings].filter(
    (entry) => daysSinceCreated(entry, reference) <= 30,
  );

  if (thread === "emotional") {
    const stressCount = recent.filter((entry) =>
      /\b(sad|upset|anxious|stressed|depressed|lonely|overwhelmed)\b/i.test(
        memoryText(entry),
      ),
    ).length;
    if (stressCount >= 3) {
      return maxMemoryWeight(base, "meaningful");
    }
  }

  if (thread === "health" && profile.type === "habit") {
    const habitCount = recent.filter((entry) =>
      /\b(coffee|tea)\b/i.test(memoryText(entry)),
    ).length;
    if (habitCount >= 4) {
      return maxMemoryWeight(base, "important");
    }
  }

  if (recent.length >= 5 && base === "light") {
    return "important";
  }

  return base;
}

export function memoryVisibility(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference = new Date(),
): MemoryVisibility {
  const weight = effectiveMemoryWeight(item, items, reference);
  const profile = buildMemoryProfile(item, reference);
  const ageDays = daysSinceCreated(item, reference);

  if (weight === "critical" || weight === "meaningful") {
    return "prominent";
  }

  if (weight === "important") {
    return ageDays > 45 ? "normal" : "prominent";
  }

  if (weight !== "light") {
    return "normal";
  }

  const siblings = itemsInSameThread(item, items, reference);
  if (siblings.length >= 3) {
    return ageDays > LIGHT_HIDE_DAYS ? "fading" : "normal";
  }

  if (profile.timeRelevance === "past" || profile.timeRelevance === "today") {
    if (ageDays > LIGHT_HIDE_DAYS) return "hidden";
    if (ageDays > LIGHT_FADE_DAYS) return "fading";
  }

  if (ageDays > LIGHT_HIDE_DAYS) return "hidden";
  return "normal";
}

export function isVisibleInMemoryList(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference = new Date(),
): boolean {
  return memoryVisibility(item, items, reference) !== "hidden";
}

export function memoryListSortScore(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference = new Date(),
): number {
  const weight = effectiveMemoryWeight(item, items, reference);
  const visibility = memoryVisibility(item, items, reference);
  const weightScore =
    weight === "critical"
      ? 400
      : weight === "meaningful"
        ? 300
        : weight === "important"
          ? 200
          : 100;
  const visibilityScore =
    visibility === "prominent"
      ? 40
      : visibility === "normal"
        ? 20
        : visibility === "fading"
          ? 5
          : 0;
  const recency = Math.max(0, 30 - daysSinceCreated(item, reference));
  return weightScore + visibilityScore + recency;
}
