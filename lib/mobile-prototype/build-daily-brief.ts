import { toDateKey } from "@/lib/calendar-utils";
import { isRelationshipCapture, resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildSyncTimeBlocksForRange,
  formatSyncClock,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import { generateHomeAmbientInsight } from "@/lib/time-block-insights";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { dayMatchesScheduleDay } from "@/lib/user-timeline-context";

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

const PREFERRED_NAME_KEY = "sync.preferredName";

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

function friendlyDeadline(item: CapturedSyncItem, reference: Date) {
  const key =
    item.timeline?.deadlineDate ??
    item.timeline?.startDate ??
    resolveCaptureDateKey(item, reference);
  const days = daysUntil(key, reference);
  if (days == null) return item.dateLabel !== "Flexible" ? item.dateLabel : null;

  if (item.timeline?.timelineRole === "deadline" || item.category === "reminder") {
    if (days === 0) return `${item.title} is due today`;
    if (days === 1) return `${item.title} is due tomorrow`;
    if (days > 1 && days <= 14) return `${item.title} is due in ${days} days`;
    if (days > 14) return `${item.title} is due ${relativeDayPhrase(days)}`;
  }

  if (days === 0) return `${item.title} is today`;
  if (days === 1) return `${item.title} is tomorrow`;
  if (days > 1 && days <= 21) return `${item.title} is in ${days} days`;
  return null;
}

function financeReminder(item: CapturedSyncItem, reference: Date) {
  if (
    !item.destinations.includes("Finance") &&
    item.category !== "expense" &&
    item.category !== "subscription" &&
    item.category !== "reminder"
  ) {
    return null;
  }

  const prompt = item.prompt.toLowerCase();
  if (/\b(payday|pay day)\b/.test(prompt) || /\bpayday\b/i.test(item.title)) {
    const phrase = friendlyDeadline(item, reference);
    return phrase ?? "Payday is coming up";
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

function buildTodayParagraph(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
) {
  const todayKey = toDateKey(reference);
  const sentences: string[] = [];
  const todayTimed = timedBlocksForDate(blocks, todayKey);
  const todayWork = todayTimed.filter((block) => block.area === "work");

  const workBlock =
    todayWork.find((block) => block.blockType === "schedule") ?? todayWork[0];

  if (workBlock?.startTime) {
    sentences.push(`Work starts at ${formatSyncClock(workBlock.startTime)}.`);
  } else if (
    workSchedule &&
    dayMatchesScheduleDay(reference.getDay(), workSchedule.days)
  ) {
    sentences.push(`Work starts at ${formatSyncClock(workSchedule.startTime)}.`);
  }

  const personalToday = todayTimed.filter(
    (block) => block.area !== "work" && block.blockType !== "schedule",
  );

  for (const block of personalToday.slice(0, 3)) {
    const time = formatSyncClock(block.startTime);
    sentences.push(
      time ? `${block.title} at ${time}.` : `${block.title} today.`,
    );
  }

  const financeItem = items
    .filter(activeItem)
    .find((item) => {
      const phrase = financeReminder(item, reference);
      if (!phrase) return false;
      const key = resolveCaptureDateKey(item, reference);
      const days = daysUntil(key, reference);
      return days != null && days <= 7;
    });

  if (financeItem) {
    const phrase = financeReminder(financeItem, reference);
    if (phrase) sentences.push(`${phrase}.`);
  }

  const workEnd = latestBlockEnd(todayWork);
  if (workEnd > 0 && workEnd < 21 * 60) {
    const openLabel = formatSyncClock(
      `${String(Math.floor(workEnd / 60)).padStart(2, "0")}:${String(workEnd % 60).padStart(2, "0")}`,
    );
    if (openLabel) {
      sentences.push(`Your evening opens up after ${openLabel}.`);
    }
  }

  if (sentences.length === 0) {
    const openToday = occupiedMinutes(todayTimed) < 2 * 60;
    if (openToday) {
      sentences.push("Your calendar is mostly open today.");
    }
  }

  return sentences.length > 0 ? sentences.join(" ") : null;
}

function buildNoticingParagraphs(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  reference: Date,
) {
  const lines: string[] = [];
  const horizonEnd = toDateKey(addDays(reference, 30));

  const protectedItems = items
    .filter(
      (item) =>
        activeItem(item) &&
        (item.protectedTime?.enabled || item.meaning?.protection.recommended),
    )
    .sort((a, b) => {
      const aKey =
        a.timeline?.deadlineDate ?? a.timeline?.startDate ?? a.createdAt;
      const bKey =
        b.timeline?.deadlineDate ?? b.timeline?.startDate ?? b.createdAt;
      return aKey.localeCompare(bKey);
    });

  for (const item of protectedItems.slice(0, 2)) {
    const when = friendlyDeadline(item, reference);
    const reason =
      item.protectedTime?.reason ??
      item.meaning?.summary ??
      item.meaning?.meaningLabel;
    if (when && reason) {
      lines.push(`${when}, and it may need protection — ${reason}.`);
    } else if (when) {
      lines.push(`${when}.`);
    } else if (reason) {
      lines.push(`${item.title} — ${reason}.`);
    }
  }

  const familyItems = items
    .filter((item) => activeItem(item) && isFamilyItem(item))
    .sort((a, b) => {
      const aKey = resolveCaptureDateKey(a, reference) ?? a.createdAt;
      const bKey = resolveCaptureDateKey(b, reference) ?? b.createdAt;
      return aKey.localeCompare(bKey);
    });

  for (const item of familyItems.slice(0, 2)) {
    if (protectedItems.some((protectedItem) => protectedItem.id === item.id)) {
      continue;
    }
    const phrase = friendlyDeadline(item, reference);
    if (phrase) lines.push(`${phrase}.`);
  }

  const relationshipItems = items
    .filter(
      (item) =>
        activeItem(item) &&
        (item.destinations.includes("Relationships") ||
          isRelationshipCapture(item)),
    )
    .filter((item) => !isFamilyItem(item));

  for (const item of relationshipItems.slice(0, 2)) {
    const phrase = friendlyDeadline(item, reference);
    if (phrase) lines.push(`${phrase}.`);
  }

  const financeItems = items
    .filter(
      (item) =>
        activeItem(item) &&
        (item.destinations.includes("Finance") ||
          item.category === "reminder" ||
          item.category === "subscription"),
    )
    .filter((item) => !lines.some((line) => line.includes(item.title)));

  for (const item of financeItems.slice(0, 2)) {
    const phrase = financeReminder(item, reference);
    if (phrase) lines.push(`${phrase}.`);
  }

  const healthGap = describeHealthGap(items, reference);
  if (healthGap) lines.push(healthGap);

  const highImportance = items
    .filter(
      (item) =>
        activeItem(item) &&
        item.meaning?.importance === "high" &&
        !protectedItems.some((protectedItem) => protectedItem.id === item.id),
    )
    .slice(0, 1);

  for (const item of highImportance) {
    const phrase = friendlyDeadline(item, reference);
    const summary = item.meaning?.summary;
    if (phrase && summary) {
      lines.push(`${phrase}. ${summary}`);
    } else if (summary) {
      lines.push(summary);
    }
  }

  const upcomingDeadlines = items
    .filter((item) => {
      if (!activeItem(item)) return false;
      const key = resolveCaptureDateKey(item, reference);
      return (
        key != null &&
        key <= horizonEnd &&
        (item.timeline?.timelineRole === "deadline" ||
          item.category === "reminder")
      );
    })
    .filter((item) => !lines.some((line) => line.includes(item.title)));

  for (const item of upcomingDeadlines.slice(0, 2)) {
    const phrase = friendlyDeadline(item, reference);
    if (phrase) lines.push(`${phrase}.`);
  }

  const unique = [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
  return unique.slice(0, 4);
}

function describeHealthGap(items: CapturedSyncItem[], reference: Date) {
  const healthItems = items
    .filter(activeItem)
    .filter(isHealthItem)
    .map((item) => ({
      item,
      dateKey: resolveCaptureDateKey(item, reference) ?? item.createdAt.slice(0, 10),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  if (healthItems.length === 0) {
    return null;
  }

  const latest = healthItems[0];
  const days = daysUntil(latest.dateKey, reference);
  if (days == null) return null;

  const daysSince = days < 0 ? Math.abs(days) : days;
  if (daysSince >= 3) {
    return `You haven't logged exercise in ${daysSince} days.`;
  }

  return null;
}

function buildPossibilityParagraphs(blocks: SyncTimeBlock[], reference: Date) {
  const lines: string[] = [];
  let openEvenings = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const dateKey = toDateKey(addDays(reference, offset));
    const dayBlocks = timedBlocksForDate(blocks, dateKey);
    const occupied = occupiedMinutes(dayBlocks);
    if (dayBlocks.length === 0 || occupied < 3 * 60) {
      openEvenings += 1;
    }
  }

  if (openEvenings >= 2) {
    lines.push(
      `You have ${openEvenings === 2 ? "two" : openEvenings} open evenings this week.`,
    );
  }

  const tomorrowKey = toDateKey(addDays(reference, 1));
  const tomorrowBlocks = timedBlocksForDate(blocks, tomorrowKey);
  if (tomorrowBlocks.length === 0 || occupiedMinutes(tomorrowBlocks) < 4 * 60) {
    lines.push("Tomorrow stays mostly open.");
  }

  const todayKey = toDateKey(reference);
  const todayBlocks = timedBlocksForDate(blocks, todayKey);
  const lastEnd = latestBlockEnd(
    todayBlocks.filter((block) => block.area === "work"),
  );
  if (lastEnd > 0 && lastEnd < 21 * 60) {
    const openLabel = formatSyncClock(
      `${String(Math.floor(lastEnd / 60)).padStart(2, "0")}:${String(lastEnd % 60).padStart(2, "0")}`,
    );
    if (openLabel && !lines.some((line) => line.includes(openLabel))) {
      lines.push(`There is open time after ${openLabel} today.`);
    }
  }

  return [...new Set(lines)].slice(0, 2);
}

export function loadPreferredName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PREFERRED_NAME_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function savePreferredName(name: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = name.trim();
    if (trimmed) {
      window.localStorage.setItem(PREFERRED_NAME_KEY, trimmed);
    }
  } catch {
    // ignore storage failures
  }
}

export function buildDailyBrief(input: {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  userName?: string | null;
}): DailyBriefSnapshot {
  const reference = input.reference ?? new Date();
  const activeItems = input.items.filter(activeItem);
  const workSchedule = input.workSchedule ?? null;
  const userName = input.userName ?? null;
  const hasUserContext = activeItems.length > 0 || workSchedule != null;

  if (!hasUserContext) {
    return {
      userName,
      lede: "Tell Sync what matters and your brief will build from your life.",
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

  const todayParagraph = buildTodayParagraph(
    blocks,
    activeItems,
    workSchedule,
    reference,
  );
  const noticingParagraphs = buildNoticingParagraphs(
    blocks,
    activeItems,
    reference,
  );
  const possibilityParagraphs = buildPossibilityParagraphs(blocks, reference);

  const sections: BriefSection[] = [];

  if (todayParagraph) {
    sections.push({ id: "today", paragraphs: [todayParagraph] });
  }

  if (noticingParagraphs.length > 0) {
    sections.push({
      id: "noticing",
      label: "Worth noticing",
      paragraphs: [noticingParagraphs.join(" ")],
    });
  }

  if (possibilityParagraphs.length > 0) {
    sections.push({
      id: "possibility",
      label: "Possibility",
      paragraphs: possibilityParagraphs,
    });
  }

  const isEmpty = sections.length === 0;
  const lede = isEmpty
    ? "Tell Sync what matters and your brief will build from your life."
    : generateHomeAmbientInsight(blocks, activeItems, reference);

  return {
    userName,
    lede,
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
