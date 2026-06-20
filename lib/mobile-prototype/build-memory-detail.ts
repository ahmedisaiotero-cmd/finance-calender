import { titleSimilarity } from "@/lib/capture-duplicate-detection";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildDailyBrief,
  describeItemTiming,
  type DailyBriefSnapshot,
} from "@/lib/mobile-prototype/build-daily-brief";
import { loadUserProfile } from "@/lib/sync-profile/user-profile";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { isWorkDayOffItem } from "@/lib/sync-capture/work-availability";
import { memoryDisplayCategory } from "@/lib/mobile-prototype/memory-category";
import {
  daysUntilDateKey,
  formatRecurrenceLabel,
  isBriefEligibleMemory,
  resolveNextOccurrenceDateKey,
} from "@/lib/timeline/next-occurrence";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type RelatedMemoryView = {
  id: string;
  title: string;
};

export type MemoryDetailView = {
  id: string;
  title: string;
  originalInput: string;
  whyRemembered: string;
  category: string;
  resolvedDate: string;
  recurrence: string | null;
  nextOccurrence: string | null;
  appears: string;
  mentionedInBrief: boolean;
  calendarImpact: boolean;
  briefEligible: boolean;
  relatedMemories: RelatedMemoryView[];
  prompt: string;
};

function activeItem(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

export function memoryPrimaryCategory(item: CapturedSyncItem): string {
  return memoryDisplayCategory(item);
}

function formatDateKeyLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function formatMemoryAppears(
  item: CapturedSyncItem,
  reference = new Date(),
): string {
  const key = resolveCaptureDateKey(item, reference);
  if (!key) {
    return item.dateLabel !== "Flexible" ? item.dateLabel : "—";
  }

  return formatDateKeyLabel(key);
}

function vagueMeaningCopy(text: string) {
  return /worth a spot|when you are ready|timeline when/i.test(text);
}

export function whySyncRemembers(
  item: CapturedSyncItem,
  reference = new Date(),
): string {
  const prompt = item.originalPrompt ?? item.prompt;
  const nextKey = item.timeline
    ? resolveNextOccurrenceDateKey(item.timeline, reference)
    : resolveCaptureDateKey(item, reference);
  const nextLabel = nextKey ? formatDateKeyLabel(nextKey) : null;
  const nearDate = nextLabel ? ` near ${nextLabel}` : " near the date";

  if (isWorkDayOffItem(item)) {
    if (/\btomorrow\b/i.test(prompt)) {
      return "Sync remembers this because it changes your work availability tomorrow.";
    }
    if (nextLabel) {
      return `Sync remembers this because you're off on ${nextLabel}.`;
    }
    return "Sync remembers this because it changes when you're available for work.";
  }

  if (item.workAvailability === "overtime") {
    return "Sync remembers this because it changes your work schedule.";
  }

  if (/\bbirthday\b|\bbday\b/i.test(prompt)) {
    if (item.destinations.includes("Relationships")) {
      return `Sync remembers this because it matters to your relationship and should surface${nearDate}.`;
    }
    return `Sync remembers this because it matters to your family and should surface${nearDate}.`;
  }

  if (
    item.parsedInput?.moneyType === "income" ||
    item.moneyType === "income" ||
    /\b(payday|get paid|every other)\b/i.test(prompt)
  ) {
    return "Sync remembers this because it affects your upcoming income.";
  }

  if (/\brent\b/i.test(prompt) && /\b(due|pay)\b/i.test(prompt)) {
    return "Sync remembers this because it affects an upcoming bill.";
  }

  if (/\bshower(?:ed|ing)?\b/i.test(prompt)) {
    return "Sync logged this as a personal care memory.";
  }

  if (item.category === "workout" || /\b(gym|workout|exercise)\b/i.test(prompt)) {
    return "Sync logged this as part of your health rhythm.";
  }

  if (item.timeline?.timelineRole === "deadline") {
    const before = nextLabel ? ` before ${nextLabel}` : "";
    return `Sync remembers this because it's a deadline Sync should surface${before}.`;
  }

  if (item.timeline?.timelineRole === "log") {
    return "Sync logged this as part of your health rhythm.";
  }

  if (item.meaning?.summary?.trim() && !vagueMeaningCopy(item.meaning.summary)) {
    return item.meaning.summary;
  }

  if (
    item.meaning?.meaningLabel?.trim() &&
    !vagueMeaningCopy(item.meaning.meaningLabel)
  ) {
    return item.meaning.meaningLabel;
  }

  return "Sync remembers this because you asked it to hold something that may matter later.";
}

export function memoryHasCalendarImpact(item: CapturedSyncItem): boolean {
  if (!item.destinations.includes("Calendar")) {
    return false;
  }

  return Boolean(
    item.timeline?.recurrence ||
      item.timeline?.startDate ||
      item.timeline?.deadlineDate ||
      item.timeline?.startTime ||
      item.timeline?.deadlineTime,
  );
}

export function itemMentionedInBrief(
  item: CapturedSyncItem,
  brief: DailyBriefSnapshot,
  reference = new Date(),
): boolean {
  const body = [
    brief.lede,
    ...brief.sections.flatMap((section) => section.paragraphs),
  ]
    .join(" ")
    .toLowerCase();

  const title = item.title.toLowerCase();
  if (body.includes(title)) {
    return true;
  }

  const titleCore = title.replace(/'s birthday/i, "").trim();
  if (titleCore.length > 2 && body.includes(titleCore)) {
    return true;
  }

  const timing = describeItemTiming(item, reference);
  if (timing && body.includes(timing.toLowerCase())) {
    return true;
  }

  return false;
}

function relatedMemoryScore(
  item: CapturedSyncItem,
  other: CapturedSyncItem,
  reference: Date,
) {
  let score = 0;

  if (memoryPrimaryCategory(item) === memoryPrimaryCategory(other)) {
    score += 0.35;
  }

  const itemDate = resolveCaptureDateKey(item, reference);
  const otherDate = resolveCaptureDateKey(other, reference);
  if (itemDate && otherDate && itemDate === otherDate) {
    score += 0.35;
  }

  score += titleSimilarity(item.title, other.title) * 0.45;

  const sharedWords = item.title
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && other.title.toLowerCase().includes(word));
  if (sharedWords.length > 0) {
    score += 0.15;
  }

  return score;
}

export function findRelatedMemories(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference = new Date(),
  limit = 3,
): RelatedMemoryView[] {
  return items
    .filter((other) => other.id !== item.id && activeItem(other))
    .map((other) => ({
      id: other.id,
      title: displayMemoryTitle(other),
      score: relatedMemoryScore(item, other, reference),
    }))
    .filter((entry) => entry.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ id, title }) => ({ id, title }));
}

export function buildMemoryDetail(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  options?: {
    reference?: Date;
    workSchedule?: PersistedWorkSchedule | null;
    brief?: DailyBriefSnapshot;
  },
): MemoryDetailView {
  const reference = options?.reference ?? new Date();
  const brief =
    options?.brief ??
    buildDailyBrief({
      items,
      workSchedule: options?.workSchedule ?? null,
      lifeProfile: loadUserProfile(),
      reference,
    });

  const nextKey = item.timeline
    ? resolveNextOccurrenceDateKey(item.timeline, reference)
    : resolveCaptureDateKey(item, reference);

  return {
    id: item.id,
    title: displayMemoryTitle(item),
    originalInput: item.originalPrompt ?? item.prompt,
    whyRemembered: whySyncRemembers(item, reference),
    category: memoryPrimaryCategory(item),
    resolvedDate: formatMemoryAppears(item, reference),
    recurrence: formatRecurrenceLabel(item.timeline),
    nextOccurrence: nextKey ? formatDateKeyLabel(nextKey) : null,
    appears: formatMemoryAppears(item, reference),
    mentionedInBrief: itemMentionedInBrief(item, brief, reference),
    calendarImpact: memoryHasCalendarImpact(item),
    briefEligible: isBriefEligibleMemory(item, reference, nextKey),
    relatedMemories: findRelatedMemories(item, items, reference),
    prompt: item.originalPrompt ?? item.prompt,
  };
}
