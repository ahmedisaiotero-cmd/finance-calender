import { captureLifeCategory, resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import { titleSimilarity } from "@/lib/capture-duplicate-detection";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { isMoneyLanguage } from "@/lib/sync-capture/surface-copy";
import {
  formatRecurrenceLabel,
  resolveNextOccurrenceDateKey,
} from "@/lib/timeline/next-occurrence";

function memoryCategoryBucket(item: CapturedSyncItem): string {
  if (item.destinations.includes("Family")) return "Family";

  const lifeCategory = captureLifeCategory(item);
  if (lifeCategory === "relationships") return "Relationships";
  if (lifeCategory === "health") return "Health";
  if (lifeCategory === "money") return "Money";
  if (lifeCategory === "work") return "Work";

  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  if (
    item.destinations.includes("Finance") ||
    item.moneyType === "income" ||
    item.category === "expense" ||
    item.category === "subscription" ||
    isMoneyLanguage(text) ||
    /\b(payday|rent|bill|subscription)\b/.test(text)
  ) {
    return "Money";
  }

  return "Personal";
}

function normalizePrompt(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function promptSimilarity(a: string, b: string) {
  return titleSimilarity(normalizePrompt(a), normalizePrompt(b));
}

function displayTitleSimilarity(a: CapturedSyncItem, b: CapturedSyncItem) {
  return titleSimilarity(displayMemoryTitle(a), displayMemoryTitle(b));
}

function resolvedDateKey(item: CapturedSyncItem, reference: Date) {
  const next = item.timeline
    ? resolveNextOccurrenceDateKey(item.timeline, reference)
    : null;
  return next ?? resolveCaptureDateKey(item, reference);
}

function recurrenceSignature(item: CapturedSyncItem) {
  const label = formatRecurrenceLabel(item.timeline);
  if (label) return label.toLowerCase();
  if (item.timeline?.recurrence?.frequency) {
    return item.timeline.recurrence.frequency;
  }
  return "once";
}

export function isBirthdayMemory(item: CapturedSyncItem) {
  const rawTitle = item.title.trim().toLowerCase();
  if (/\bbirthday\b/.test(rawTitle)) return true;

  const prompt = (item.originalPrompt ?? item.prompt).toLowerCase().trim();
  return (
    /\bmy\s+[a-z]+(?:'s)?\s+(?:birthday|bday)\s+is\b/.test(prompt) ||
    /^[a-z]+(?:'s)?\s+birthday\s+is\b/.test(prompt)
  );
}

function birthdayPersonKey(item: CapturedSyncItem) {
  const prompt = normalizePrompt(item.originalPrompt ?? item.prompt);
  const match = prompt.match(
    /\bmy\s+([a-z]+(?:'s)?)\s+(?:b(?:irth)?d(?:ay)?|bday)\b/,
  );
  if (match?.[1]) {
    return match[1].replace(/'s$/, "").replace(/s$/, "");
  }

  const title = displayMemoryTitle(item).toLowerCase();
  const titleMatch = title.match(/^([a-z]+)'s birthday$/);
  return titleMatch?.[1]?.replace(/s$/, "") ?? null;
}

function titleQualityScore(item: CapturedSyncItem) {
  const raw = item.title.trim().toLowerCase();
  const clean = displayMemoryTitle(item).toLowerCase();
  let score = 0;
  if (raw === clean) score += 2;
  if (!/\b(is|was|on)\b/.test(raw)) score += 1;
  if (!/girlfrienda|girlfriends?s?s/i.test(raw)) score += 1;
  if (item.originalPrompt?.trim()) score += 1;
  return score;
}

export function areMemoryDuplicates(
  left: CapturedSyncItem,
  right: CapturedSyncItem,
  reference = new Date(),
): boolean {
  if (left.id === right.id) return true;

  const leftCategory = memoryCategoryBucket(left);
  const rightCategory = memoryCategoryBucket(right);
  if (leftCategory !== rightCategory) return false;

  const leftDate = resolvedDateKey(left, reference);
  const rightDate = resolvedDateKey(right, reference);
  const sameDate = Boolean(leftDate && rightDate && leftDate === rightDate);
  const sameRecurrence = recurrenceSignature(left) === recurrenceSignature(right);

  const rawTitleSim = titleSimilarity(left.title, right.title);
  const displaySim = displayTitleSimilarity(left, right);
  const titleSim =
    rawTitleSim >= 0.78
      ? rawTitleSim
      : isBirthdayMemory(left) && isBirthdayMemory(right)
        ? displaySim
        : rawTitleSim;
  const promptSim = promptSimilarity(
    left.originalPrompt ?? left.prompt,
    right.originalPrompt ?? right.prompt,
  );

  if (titleSim >= 0.92 || promptSim >= 0.9) {
    return sameDate || sameRecurrence;
  }

  if (titleSim >= 0.78 && promptSim >= 0.65 && sameDate) {
    return true;
  }

  if (isBirthdayMemory(left) && isBirthdayMemory(right) && sameDate) {
    const leftPerson = birthdayPersonKey(left);
    const rightPerson = birthdayPersonKey(right);
    if (leftPerson && rightPerson && leftPerson === rightPerson) {
      return true;
    }
    if (titleSim >= 0.7) return true;
  }

  return false;
}

export function pickCanonicalMemory(
  items: CapturedSyncItem[],
): CapturedSyncItem {
  return [...items].sort((a, b) => {
    const quality = titleQualityScore(b) - titleQualityScore(a);
    if (quality !== 0) return quality;
    return b.updatedAt.localeCompare(a.updatedAt);
  })[0];
}

export function dedupeMemoryItems(
  items: CapturedSyncItem[],
  reference = new Date(),
): CapturedSyncItem[] {
  const active = items.filter(
    (item) => item.status !== "cancelled" && !item.deletedAt,
  );
  const sorted = [...active].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const kept: CapturedSyncItem[] = [];

  for (const item of sorted) {
    const duplicateOf = kept.find((existing) =>
      areMemoryDuplicates(item, existing, reference),
    );
    if (duplicateOf) continue;
    kept.push(item);
  }

  return kept.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function areNoisyRelatedMemories(
  item: CapturedSyncItem,
  other: CapturedSyncItem,
  reference = new Date(),
): boolean {
  if (areMemoryDuplicates(item, other, reference)) return true;

  const rawTitleSim = titleSimilarity(item.title, other.title);
  if (rawTitleSim >= 0.72) return true;

  const displaySim = displayTitleSimilarity(item, other);
  if (displaySim >= 0.72) {
    return isBirthdayMemory(item) && isBirthdayMemory(other);
  }

  if (isBirthdayMemory(item) && isBirthdayMemory(other)) {
    const sameDate =
      resolvedDateKey(item, reference) === resolvedDateKey(other, reference);
    if (sameDate) return true;
  }

  return false;
}
