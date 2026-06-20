import { titleSimilarity } from "@/lib/capture-duplicate-detection";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildDailyBrief,
  describeItemTiming,
  type DailyBriefSnapshot,
} from "@/lib/mobile-prototype/build-daily-brief";
import {
  analyzeMeaning,
  buildWhySummaryFromMeaning,
} from "@/lib/intelligence/meaning-engine";
import { resolveMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import {
  describeBriefPresence,
  describeImportance,
  describeSurfaceEligibility,
  describeTimeImpact,
  whyRememberedFallback,
} from "@/lib/mobile-prototype/sync-voice";
import {
  extractPersonFromMemory,
  formatRelatedPersonLabel,
} from "@/lib/intelligence/person-entities";
import { scoreMemoryImportance } from "@/lib/intelligence/importance-scoring";
import { areNoisyRelatedMemories, isBirthdayMemory } from "@/lib/sync-capture/memory-dedup";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { isWorkDayOffItem } from "@/lib/sync-capture/work-availability";
import { loadUserProfile } from "@/lib/sync-profile/user-profile";
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
  cleanedSummary: string;
  whyRemembered: string;
  importance: string;
  category: string;
  relatedPerson: string | null;
  resolvedDate: string;
  recurrence: string | null;
  nextOccurrence: string | null;
  appears: string;
  briefPresence: string;
  surfaceEligibility: string;
  timeImpact: string;
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
      return "This changes your availability tomorrow.";
    }
    if (nextLabel) {
      return `You're off on ${nextLabel} — I'll factor that into your days.`;
    }
    return "This changes when you're available for work.";
  }

  if (item.workAvailability === "overtime") {
    return "This shifts your work schedule.";
  }

  if (/\bbirthday\b|\bbday\b/i.test(prompt)) {
    if (item.destinations.includes("Relationships")) {
      return `This matters to your relationship — I'll surface it${nearDate}.`;
    }
    return `This matters to your family — I'll surface it${nearDate}.`;
  }

  if (item.meaning) {
    const fromMeaning = buildWhySummaryFromMeaning(item.meaning);
    if (fromMeaning.trim() && !vagueMeaningCopy(fromMeaning)) {
      return fromMeaning;
    }
    if (item.meaning.summary?.trim() && !vagueMeaningCopy(item.meaning.summary)) {
      return item.meaning.summary;
    }
  }

  const analyzed = analyzeMeaning({
    title: item.title,
    normalizedText: prompt,
    category: item.category,
    destinations: item.destinations,
    timeline: item.timeline,
    items: [item],
  });

  if (analyzed.summary.trim() && !vagueMeaningCopy(analyzed.summary)) {
    return analyzed.summary;
  }

  if (analyzed.meaningLabel.trim() && !vagueMeaningCopy(analyzed.meaningLabel)) {
    return analyzed.meaningLabel;
  }

  return whyRememberedFallback();
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
  if (areNoisyRelatedMemories(item, other, reference)) return 0;

  let score = 0;
  const itemDate = resolveCaptureDateKey(item, reference);
  const otherDate = resolveCaptureDateKey(other, reference);

  if (itemDate && otherDate && itemDate === otherDate) {
    const itemBirthday = isBirthdayMemory(item);
    const otherBirthday = isBirthdayMemory(other);
    if (itemBirthday !== otherBirthday) {
      score += 0.55;
    }
  }

  if (memoryPrimaryCategory(item) === memoryPrimaryCategory(other)) {
    score += 0.2;
  }

  const itemPrompt = (item.originalPrompt ?? item.prompt).toLowerCase();
  const otherPrompt = (other.originalPrompt ?? other.prompt).toLowerCase();
  if (isBirthdayMemory(item)) {
    const person = displayMemoryTitle(item)
      .replace(/'s birthday$/i, "")
      .toLowerCase();
    if (person && otherPrompt.includes(person)) {
      score += 0.35;
    }
  }

  const titleSim = titleSimilarity(
    displayMemoryTitle(item),
    displayMemoryTitle(other),
  );
  if (titleSim >= 0.35 && titleSim < 0.65) {
    score += 0.25;
  }

  const sharedWords = displayMemoryTitle(item)
    .toLowerCase()
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 &&
        displayMemoryTitle(other).toLowerCase().includes(word),
    );
  if (sharedWords.length > 0 && !isBirthdayMemory(item) && !isBirthdayMemory(other)) {
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
    .filter((entry) => entry.score >= 0.5)
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

  const meaning =
    item.meaning ??
    analyzeMeaning({
      title: item.title,
      normalizedText: item.originalPrompt ?? item.prompt,
      category: item.category,
      destinations: item.destinations,
      timeline: item.timeline,
      items: [item],
    });
  const person = extractPersonFromMemory(item);
  const mentionedInBrief = itemMentionedInBrief(item, brief, reference);
  const briefEligible = isBriefEligibleMemory(item, reference, nextKey);
  const calendarImpact = memoryHasCalendarImpact(item);

  return {
    id: item.id,
    title: displayMemoryTitle(item),
    originalInput: item.originalPrompt ?? item.prompt,
    cleanedSummary: resolveMemoryUnderstanding(item, reference),
    whyRemembered: whySyncRemembers(item, reference),
    importance: describeImportance(scoreMemoryImportance(item, reference)),
    category: memoryPrimaryCategory(item),
    relatedPerson: person ? formatRelatedPersonLabel(person) : null,
    resolvedDate: formatMemoryAppears(item, reference),
    recurrence: formatRecurrenceLabel(item.timeline),
    nextOccurrence: nextKey ? formatDateKeyLabel(nextKey) : null,
    appears: formatMemoryAppears(item, reference),
    briefPresence: describeBriefPresence(mentionedInBrief),
    surfaceEligibility: describeSurfaceEligibility(briefEligible),
    timeImpact: describeTimeImpact(calendarImpact),
    mentionedInBrief,
    calendarImpact,
    briefEligible,
    relatedMemories: findRelatedMemories(item, items, reference),
    prompt: item.originalPrompt ?? item.prompt,
  };
}
