import { titleSimilarity } from "@/lib/capture-duplicate-detection";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildDailyBrief,
  describeItemTiming,
  type DailyBriefSnapshot,
} from "@/lib/mobile-prototype/build-daily-brief";
import { loadUserProfile } from "@/lib/sync-profile/user-profile";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type MemoryDetailView = {
  id: string;
  title: string;
  whyRemembered: string;
  category: string;
  appears: string;
  mentionedInBrief: boolean;
  calendarImpact: boolean;
  relatedMemories: string[];
  prompt: string;
};

const CATEGORY_ORDER = [
  "Family",
  "Finance",
  "Health",
  "Work",
  "Goals",
  "Relationships",
  "School",
] as const;

function activeItem(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

export function memoryPrimaryCategory(item: CapturedSyncItem): string {
  for (const destination of CATEGORY_ORDER) {
    if (item.destinations.includes(destination)) {
      return destination;
    }
  }
  return "Personal";
}

export function formatMemoryAppears(
  item: CapturedSyncItem,
  reference = new Date(),
): string {
  const key = resolveCaptureDateKey(item, reference);
  if (!key) {
    return item.dateLabel !== "Flexible" ? item.dateLabel : "—";
  }

  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function whySyncRemembers(item: CapturedSyncItem): string {
  if (item.meaning?.summary?.trim()) {
    return item.meaning.summary;
  }

  if (item.meaning?.meaningLabel?.trim()) {
    return item.meaning.meaningLabel;
  }

  const prompt = item.originalPrompt ?? item.prompt;

  if (/\bbirthday\b/i.test(prompt)) {
    return "A family date you asked Sync to keep in view.";
  }

  if (item.timeline?.timelineRole === "deadline") {
    return "A deadline you asked Sync to track.";
  }

  if (item.category === "workout" || item.destinations.includes("Health")) {
    return "Part of the health rhythm Sync is watching.";
  }

  if (
    item.parsedInput?.moneyType === "income" ||
    item.moneyType === "income" ||
    /\b(payday|get paid)\b/i.test(prompt)
  ) {
    return "Income timing Sync uses for your brief.";
  }

  return "Something you told Sync to hold.";
}

export function memoryHasCalendarImpact(item: CapturedSyncItem): boolean {
  if (!item.destinations.includes("Calendar")) {
    return false;
  }

  return Boolean(
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
): string[] {
  return items
    .filter((other) => other.id !== item.id && activeItem(other))
    .map((other) => ({
      title: other.title,
      score: relatedMemoryScore(item, other, reference),
    }))
    .filter((entry) => entry.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.title);
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

  return {
    id: item.id,
    title: item.title,
    whyRemembered: whySyncRemembers(item),
    category: memoryPrimaryCategory(item),
    appears: formatMemoryAppears(item, reference),
    mentionedInBrief: itemMentionedInBrief(item, brief, reference),
    calendarImpact: memoryHasCalendarImpact(item),
    relatedMemories: findRelatedMemories(item, items, reference),
    prompt: item.originalPrompt ?? item.prompt,
  };
}
