import { toDateKey } from "@/lib/calendar-utils";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildSyncTimeBlocksForRange,
  formatSyncClock,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import { generateAmbientInsightFromBlocks } from "@/lib/time-block-insights";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { dayMatchesScheduleDay } from "@/lib/user-timeline-context";
import { loadUserProfile, saveUserProfile } from "@/lib/sync-profile/user-profile";
import type { SyncUserProfile } from "@/lib/sync-profile/user-profile";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import {
  collectWorkDayOffDateKeys,
  isWorkDayOffItem,
} from "@/lib/sync-capture/work-availability";

export type BriefSectionId = "today" | "noticing" | "possibility";

export type BriefSection = {
  id: BriefSectionId;
  label?: string;
  paragraphs: string[];
};

export type DailyBriefSnapshot = {
  userName: string | null;
  lede: string;
  sections: BriefSection[];
  isEmpty: boolean;
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function activeItem(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

function clockToMinutes(value?: string) {
  if (!value) return null;
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function timedBlocksForDate(blocks: SyncTimeBlock[], dateKey: string) {
  return blocks.filter(
    (block) => block.date === dateKey && block.isTimed && block.startTime,
  );
}

function occupiedMinutes(blocks: SyncTimeBlock[]) {
  return blocks.reduce((total, block) => {
    const start = clockToMinutes(block.startTime);
    const end =
      clockToMinutes(block.endTime) ??
      (start != null ? start + 60 : null);
    if (start == null || end == null) return total;
    const normalizedEnd = end <= start ? end + 24 * 60 : end;
    return total + (normalizedEnd - start);
  }, 0);
}

function latestBlockEnd(blocks: SyncTimeBlock[]) {
  let latest = 0;
  for (const block of blocks) {
    const end = clockToMinutes(block.endTime) ?? clockToMinutes(block.startTime);
    if (end != null && end > latest) latest = end;
  }
  return latest;
}

function daysUntil(dateKey: string | null, reference: Date) {
  if (!dateKey) return null;
  const today = toDateKey(reference);
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function relativeDayPhrase(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1 && days < 7) return `in ${days} days`;
  if (days >= 7 && days < 14) return "next week";
  if (days >= 14 && days < 45) return "later this month";
  return "coming up";
}

function displayItemTitle(item: CapturedSyncItem) {
  const cleaned = displayMemoryTitle(item);
  if (cleaned !== "Memory" && cleaned !== item.title) {
    return cleaned;
  }

  if (item.title === "Reminder" || item.title.endsWith(" Reminder")) {
    const dueMatch = item.prompt.match(/^([a-z0-9 '&.-]+)\s+is\s+due\b/i);
    if (dueMatch) {
      return dueMatch[1]
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }
  return item.title.replace(/\s+Reminder$/i, "");
}

function isMinorLog(item: CapturedSyncItem) {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  if (/\b(showered|shower)\b/.test(text)) return true;
  if (item.timeline?.timelineRole === "log") {
    if (item.meaning?.importance === "high") return false;
    if (/\b(overtime|worked)\b/.test(text)) return false;
    return true;
  }
  return false;
}

function isDeadlineItem(item: CapturedSyncItem) {
  return (
    item.timeline?.timelineRole === "deadline" ||
    (item.category === "reminder" &&
      /\b(due|rent|bill)\b/i.test(`${item.title} ${item.prompt}`))
  );
}

function isFinanceItem(item: CapturedSyncItem) {
  return (
    isPaydayItem(item) ||
    item.destinations.includes("Finance") ||
    item.category === "expense" ||
    item.category === "subscription" ||
    item.category === "reminder"
  );
}

function weekdayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}

function foresightPhrase(item: CapturedSyncItem, reference: Date) {
  const key = resolveCaptureDateKey(item, reference);
  const days = daysUntil(key, reference);
  if (days == null || days < 0) return null;

  if (isPaydayItem(item)) {
    if (days === 0) return "Payday is today";
    if (days === 1) return "Payday is tomorrow";
    if (days >= 2 && days <= 7 && key) {
      return `Payday lands ${weekdayLabel(key)}.`;
    }
    if (days <= 14) return `Payday is in ${days} days.`;
    return null;
  }

  return friendlyDeadline(item, reference);
}

function isVagueForesightLine(line: string) {
  const normalized = line.toLowerCase();
  return (
    /worth a (quick )?check/.test(normalized) ||
    /worth a spot/.test(normalized) ||
    /worth noticing/.test(normalized) ||
    /haven't logged exercise/.test(normalized) ||
    /may need protection/.test(normalized) ||
    /nothing urgent right now/.test(normalized) ||
    /here's what matters/.test(normalized)
  );
}

function normalizeBriefFact(text: string) {
  return text.toLowerCase().replace(/[.!?]/g, "").trim();
}

function briefFactsOverlap(a: string, b: string) {
  const left = normalizeBriefFact(a);
  const right = normalizeBriefFact(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const sharedTopics = [
    "payday",
    "work starts",
    "evening opens",
    "open time after",
    "haven't logged exercise",
    "birthday",
    "rent",
    "overtime",
  ];

  return sharedTopics.some(
    (topic) => left.includes(topic) && right.includes(topic),
  );
}

function filterBriefLines(lines: string[], lede: string | null) {
  if (!lede) return lines;
  return lines.filter((line) => !briefFactsOverlap(line, lede));
}

function splitBriefSentences(paragraph: string) {
  return paragraph
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function joinBriefSentences(sentences: string[]) {
  return sentences.join(" ");
}

function isPaydayItem(item: CapturedSyncItem) {
  const text = `${item.title} ${item.prompt}`.toLowerCase();
  return (
    item.parsedInput?.moneyType === "income" ||
    item.moneyType === "income" ||
    /\b(payday|pay day|get paid|paycheck)\b/.test(text) ||
    item.title === "Payday" ||
    item.title === "Upcoming Paycheck"
  );
}

function paydayPhrase(item: CapturedSyncItem, reference: Date) {
  const key =
    item.timeline?.deadlineDate ??
    item.timeline?.startDate ??
    resolveCaptureDateKey(item, reference);
  const days = daysUntil(key, reference);
  if (days == null) return null;
  if (days === 0) return "Payday is today";
  if (days === 1) return "Payday is tomorrow";
  if (days > 1 && days <= 21) return `Payday is in ${days} days`;
  return null;
}

export function describeItemTiming(item: CapturedSyncItem, reference: Date) {
  if (isPaydayItem(item)) {
    return paydayPhrase(item, reference) ?? friendlyDeadline(item, reference);
  }
  return friendlyDeadline(item, reference);
}

function deadlineBriefSubject(item: CapturedSyncItem) {
  const prompt = (item.originalPrompt ?? item.prompt).toLowerCase();
  if (/\brent\b/.test(prompt) && /\b(due|pay)\b/.test(prompt)) {
    return "Rent";
  }

  const title = displayItemTitle(item);
  if (/\bdue$/i.test(title)) {
    return title.replace(/\s+due$/i, "").trim() || title;
  }

  return title;
}

function friendlyDeadline(item: CapturedSyncItem, reference: Date) {
  const title = deadlineBriefSubject(item);
  const key =
    item.timeline?.deadlineDate ??
    item.timeline?.startDate ??
    resolveCaptureDateKey(item, reference);
  const days = daysUntil(key, reference);
  if (days == null) return item.dateLabel !== "Flexible" ? item.dateLabel : null;

  if (item.timeline?.timelineRole === "deadline" || item.category === "reminder") {
    if (days === 0) return `${title} is due today`;
    if (days === 1) return `${title} is due tomorrow`;
    if (days > 1 && days <= 7 && key) {
      const [y, m, d] = key.split("-").map(Number);
      const weekday = new Date(y, m - 1, d).toLocaleDateString("en-US", {
        weekday: "long",
      });
      return `${title} is due ${weekday}`;
    }
    if (days > 1 && days <= 14) return `${title} is due in ${days} days`;
    if (days > 14) return `${title} is due ${relativeDayPhrase(days)}`;
  }

  if (days === 0) return `${title} is today`;
  if (days === 1) return `${title} is tomorrow`;
  if (days > 1 && days <= 21) return `${title} is in ${days} days`;
  return null;
}

function financeReminder(item: CapturedSyncItem, reference: Date) {
  if (isPaydayItem(item)) {
    return paydayPhrase(item, reference);
  }

  if (
    !item.destinations.includes("Finance") &&
    item.category !== "expense" &&
    item.category !== "subscription" &&
    item.category !== "reminder"
  ) {
    return null;
  }

  return friendlyDeadline(item, reference);
}

function isFamilyItem(item: CapturedSyncItem) {
  return (
    item.destinations.includes("Family") ||
    item.destinations.includes("School") ||
    /\b(daughter|son|mom|mother|dad|father|family|birthday)\b/i.test(
      `${item.title} ${item.prompt}`,
    )
  );
}

function isHealthItem(item: CapturedSyncItem) {
  return (
    item.destinations.includes("Health") ||
    item.category === "workout" ||
    /\b(gym|workout|exercise|run|walk)\b/i.test(`${item.title} ${item.prompt}`)
  );
}

function describeUpcomingWorkStretch(
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
  horizonDays: number,
  dayOffDates?: Set<string>,
) {
  if (!workSchedule?.days?.length) return null;

  let count = 0;
  for (let offset = 1; offset <= horizonDays; offset += 1) {
    const date = addDays(reference, offset);
    const dateKey = toDateKey(date);
    if (dayOffDates?.has(dateKey)) continue;
    if (dayMatchesScheduleDay(date.getDay(), workSchedule.days)) {
      count += 1;
    }
  }

  if (count >= 3) return "You work the next three days.";
  return null;
}

function describeTomorrowOpenAfterWork(
  blocks: SyncTimeBlock[],
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
  dayOffDates?: Set<string>,
) {
  const tomorrowKey = toDateKey(addDays(reference, 1));
  const tomorrow = addDays(reference, 1);

  if (dayOffDates?.has(tomorrowKey)) return null;

  if (
    workSchedule &&
    dayMatchesScheduleDay(tomorrow.getDay(), workSchedule.days)
  ) {
    const tomorrowWork = timedBlocksForDate(blocks, tomorrowKey).filter(
      (block) => block.area === "work",
    );
    const workEnd = latestBlockEnd(tomorrowWork);
    if (workEnd > 0) {
      const openLabel = formatSyncClock(
        `${String(Math.floor(workEnd / 60)).padStart(2, "0")}:${String(workEnd % 60).padStart(2, "0")}`,
      );
      if (openLabel) {
        return `Tomorrow is open after ${openLabel}.`;
      }
    }
  }

  const ambient = generateAmbientInsightFromBlocks(blocks, reference);
  if (/tomorrow is mostly open/i.test(ambient)) {
    return "Tomorrow is open after work.";
  }

  return null;
}

function buildForesightParagraphs(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
  lede: string | null,
) {
  type ForesightEntry = {
    sortDays: number;
    dateKey: string | null;
    phrase: string;
  };

  const entries: ForesightEntry[] = [];
  const dayOffDates = collectWorkDayOffDateKeys(items, reference);

  const itemEntries = items
    .filter((item) => activeItem(item) && !isMinorLog(item))
    .map((item) => {
      const key = resolveCaptureDateKey(item, reference);
      const days = daysUntil(key, reference);
      const phrase = foresightPhrase(item, reference);
      if (days == null || days < 2 || !phrase) return null;
      return {
        sortDays: days,
        dateKey: key,
        phrase: phrase.endsWith(".") ? phrase : `${phrase}.`,
      };
    })
    .filter((entry): entry is ForesightEntry => entry != null);

  const withinThreeItems = itemEntries.filter((entry) => entry.sortDays <= 3);
  const withinSevenItems = itemEntries.filter((entry) => entry.sortDays <= 7);
  const itemPool =
    withinThreeItems.length > 0 ? withinThreeItems : withinSevenItems;

  entries.push(...itemPool);

  const tomorrowOpen = describeTomorrowOpenAfterWork(
    blocks,
    workSchedule,
    reference,
    dayOffDates,
  );
  if (tomorrowOpen) {
    entries.push({
      sortDays: 1,
      dateKey: toDateKey(addDays(reference, 1)),
      phrase: tomorrowOpen.endsWith(".") ? tomorrowOpen : `${tomorrowOpen}.`,
    });
  }

  const workStretch = describeUpcomingWorkStretch(
    workSchedule,
    reference,
    3,
    dayOffDates,
  );
  if (workStretch) {
    entries.push({
      sortDays: 2,
      dateKey: null,
      phrase: workStretch.endsWith(".") ? workStretch : `${workStretch}.`,
    });
  }

  entries.sort((a, b) => {
    if (a.sortDays !== b.sortDays) return a.sortDays - b.sortDays;
    if (a.dateKey && b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return 0;
  });

  const deduped: string[] = [];
  for (const entry of entries) {
    if (isVagueForesightLine(entry.phrase)) continue;
    if (lede && briefFactsOverlap(entry.phrase, lede)) continue;
    if (deduped.some((existing) => briefFactsOverlap(existing, entry.phrase))) {
      continue;
    }
    deduped.push(entry.phrase);
  }

  if (deduped.length === 0) {
    const ambient = generateAmbientInsightFromBlocks(blocks, reference);
    if (ambient && !isVagueForesightLine(ambient)) {
      return [ambient.endsWith(".") ? ambient : `${ambient}.`];
    }
  }

  return deduped.slice(0, 3);
}

type HeadlineCandidate = { priority: number; text: string };

function profilePriorityBoost(
  item: CapturedSyncItem,
  priorities: string[],
): number {
  if (priorities.length === 0) return 0;

  const matchers: Record<string, (candidate: CapturedSyncItem) => boolean> = {
    Family: isFamilyItem,
    Money: (candidate) =>
      isPaydayItem(candidate) ||
      candidate.destinations.includes("Finance") ||
      candidate.category === "expense" ||
      candidate.category === "subscription",
    Health: isHealthItem,
    Work: (candidate) =>
      candidate.destinations.includes("Work") ||
      candidate.category === "workday" ||
      candidate.category === "work-schedule",
    Goals: (candidate) =>
      candidate.destinations.includes("Goals") ||
      candidate.category === "savings-goal",
    Home: (candidate) =>
      candidate.category === "reminder" &&
      !candidate.destinations.includes("Finance"),
  };

  let boost = 0;
  priorities.forEach((priority, index) => {
    const matches = matchers[priority];
    if (matches?.(item)) {
      boost -= (priorities.length - index) * 5;
    }
  });

  return boost;
}

function dayOffHeadline(item: CapturedSyncItem, reference: Date) {
  const days = daysUntil(resolveCaptureDateKey(item, reference), reference);
  if (days === 0) return "You're off today";
  if (days === 1) return "You're off tomorrow";
  return null;
}

function itemHeadlinePriority(
  item: CapturedSyncItem,
  days: number,
  priorities: string[],
) {
  let base = 80;
  if (days === 0) {
    if (isWorkDayOffItem(item)) base = 1;
    else if (isDeadlineItem(item)) base = 2;
    else if (isPaydayItem(item)) base = 4;
    else if (isFinanceItem(item)) base = 5;
    else if (isFamilyItem(item)) base = 6;
    else if (
      item.destinations.includes("Relationships") ||
      isRelationshipCapture(item)
    ) {
      base = 7;
    } else base = 9;
  } else if (days === 1) {
    if (isWorkDayOffItem(item)) base = 3;
    else if (isDeadlineItem(item)) base = 11;
    else if (isPaydayItem(item)) base = 13;
    else if (isFinanceItem(item)) base = 14;
    else if (isFamilyItem(item)) base = 15;
    else if (
      item.destinations.includes("Relationships") ||
      isRelationshipCapture(item)
    ) {
      base = 16;
    } else base = 18;
  }
  return base + profilePriorityBoost(item, priorities);
}

function collectHeadlineCandidates(
  items: CapturedSyncItem[],
  blocks: SyncTimeBlock[],
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
  priorities: string[],
) {
  const candidates: HeadlineCandidate[] = [];
  const todayKey = toDateKey(reference);
  const todayTimed = timedBlocksForDate(blocks, todayKey);
  const todayWork = todayTimed.filter((block) => block.area === "work");

  for (const item of items.filter(activeItem)) {
    if (isMinorLog(item)) continue;

    const key = resolveCaptureDateKey(item, reference);
    const days = daysUntil(key, reference);
    if (days == null || days < 0 || days > 1) continue;

    if (isWorkDayOffItem(item)) {
      const offPhrase = dayOffHeadline(item, reference);
      if (offPhrase) {
        candidates.push({
          priority: itemHeadlinePriority(item, days, priorities),
          text: `${offPhrase}.`,
        });
      }
      continue;
    }

    const phrase = isPaydayItem(item)
      ? paydayPhrase(item, reference)
      : friendlyDeadline(item, reference);
    if (!phrase) continue;

    candidates.push({
      priority: itemHeadlinePriority(item, days, priorities),
      text: phrase.endsWith(".") ? phrase : `${phrase}.`,
    });
  }

  const workOffToday = items.some((item) => {
    if (!activeItem(item) || !isWorkDayOffItem(item)) return false;
    return daysUntil(resolveCaptureDateKey(item, reference), reference) === 0;
  });

  const workBlock =
    todayWork.find((block) => block.blockType === "schedule") ?? todayWork[0];

  if (!workOffToday && workBlock?.startTime) {
    candidates.push({
      priority: 20,
      text: `Work starts at ${formatSyncClock(workBlock.startTime)}.`,
    });
  } else if (
    !workOffToday &&
    workSchedule &&
    dayMatchesScheduleDay(reference.getDay(), workSchedule.days)
  ) {
    candidates.push({
      priority: 20,
      text: `Work starts at ${formatSyncClock(workSchedule.startTime)}.`,
    });
  }

  const personalToday = todayTimed.filter(
    (block) => block.area !== "work" && block.blockType !== "schedule",
  );
  for (const block of personalToday.slice(0, 1)) {
    const time = formatSyncClock(block.startTime);
    candidates.push({
      priority: 8,
      text: time
        ? `${block.title} at ${time} today.`
        : `${block.title} is today.`,
    });
  }

  const workEnd = latestBlockEnd(todayWork);
  if (workEnd > 0 && workEnd < 21 * 60) {
    const openLabel = formatSyncClock(
      `${String(Math.floor(workEnd / 60)).padStart(2, "0")}:${String(workEnd % 60).padStart(2, "0")}`,
    );
    if (openLabel) {
      candidates.push({
        priority: 30,
        text: `Your evening opens after ${openLabel}.`,
      });
    }
  }

  return candidates.sort((a, b) => a.priority - b.priority);
}

function buildBriefLede(
  items: CapturedSyncItem[],
  blocks: SyncTimeBlock[],
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
  priorities: string[],
) {
  const candidates = collectHeadlineCandidates(
    items,
    blocks,
    workSchedule,
    reference,
    priorities,
  );
  if (candidates.length > 0) {
    return candidates[0].text;
  }

  return "Nothing urgent today.";
}

export function formatProfileDisplayName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function loadPreferredName(): string | null {
  const name = loadUserProfile().name.trim();
  return name || null;
}

export function loadProfileDisplayName(): string | null {
  const name = loadPreferredName();
  if (!name) return null;
  return formatProfileDisplayName(name);
}

export function savePreferredName(name: string) {
  const profile = loadUserProfile();
  saveUserProfile({ ...profile, name: name.trim() });
}

export function buildDailyBrief(input: {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  userName?: string | null;
  lifeProfile?: SyncUserProfile | null;
}): DailyBriefSnapshot {
  const reference = input.reference ?? new Date();
  const activeItems = input.items.filter(activeItem);
  const workSchedule = input.workSchedule ?? null;
  const userName = input.userName ?? input.lifeProfile?.name ?? null;
  const lifeProfile = input.lifeProfile ?? null;
  const hasUserContext =
    activeItems.length > 0 ||
    workSchedule != null ||
    Boolean(
      lifeProfile?.onboardingComplete &&
        (lifeProfile.typicalWeek.trim() ||
          lifeProfile.comingUp.trim() ||
          lifeProfile.name.trim()),
    );

  if (!hasUserContext) {
    return {
      userName,
      lede: "Tell Sync what matters. Your brief builds from what you share.",
      sections: [],
      isEmpty: true,
    };
  }

  const end = addDays(reference, 21);
  const blocks = buildSyncTimeBlocksForRange({
    items: activeItems,
    startDate: reference,
    endDate: end,
    reference,
    workSchedule,
  });

  const lede = buildBriefLede(
    activeItems,
    blocks,
    workSchedule,
    reference,
    lifeProfile?.priorities ?? [],
  );

  const foresightParagraphs = buildForesightParagraphs(
    blocks,
    activeItems,
    workSchedule,
    reference,
    lede,
  );

  const sections: BriefSection[] = [];

  if (foresightParagraphs.length > 0) {
    sections.push({
      id: "noticing",
      label: "Coming soon",
      paragraphs: [foresightParagraphs.join(" ")],
    });
  }

  const hasHeadline =
    lede !== "Nothing urgent today." && lede.trim().length > 0;
  const isEmpty = sections.length === 0 && !hasHeadline;

  return {
    userName,
    lede: isEmpty
      ? "Tell Sync what matters. Your brief builds from what you share."
      : lede,
    sections,
    isEmpty,
  };
}

export function greetingForHour(hour: number, name?: string | null) {
  const trimmed = name?.trim();
  const suffix = trimmed ? `, ${trimmed}` : "";
  if (hour < 12) return `Good morning${suffix}.`;
  if (hour < 17) return `Good afternoon${suffix}.`;
  return `Good evening${suffix}.`;
}

export function formatBriefDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
