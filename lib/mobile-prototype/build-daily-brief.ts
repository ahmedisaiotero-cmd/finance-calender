import { toDateKey } from "@/lib/calendar-utils";
import { isRelationshipCapture, resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildSyncTimeBlocksForRange,
  formatSyncClock,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { dayMatchesScheduleDay } from "@/lib/user-timeline-context";
import { loadUserProfile, saveUserProfile } from "@/lib/sync-profile/user-profile";
import type { SyncUserProfile } from "@/lib/sync-profile/user-profile";

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

function friendlyDeadline(item: CapturedSyncItem, reference: Date) {
  const title = displayItemTitle(item);
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

function buildTodayParagraph(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
  lede: string | null,
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
      return days != null && days <= 1;
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
      sentences.push(`Your evening opens after ${openLabel}.`);
    }
  }

  if (sentences.length === 0) {
    return null;
  }

  return joinBriefSentences(filterBriefLines(sentences, lede));
}

function buildNoticingParagraphs(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  reference: Date,
  lede: string | null,
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
  const deduped: string[] = [];

  for (const line of unique) {
    if (lede && briefFactsOverlap(line, lede)) continue;
    if (deduped.some((existing) => briefFactsOverlap(existing, line))) continue;
    deduped.push(line);
  }

  return filterBriefLines(deduped, lede).slice(0, 4);
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

function buildPossibilityParagraphs(
  blocks: SyncTimeBlock[],
  reference: Date,
  lede: string | null,
  todayParagraph: string | null,
) {
  const lines: string[] = [];
  const todayKey = toDateKey(reference);
  const todayBlocks = timedBlocksForDate(blocks, todayKey);
  const lastEnd = latestBlockEnd(
    todayBlocks.filter((block) => block.area === "work"),
  );

  if (lastEnd > 0 && lastEnd < 21 * 60) {
    const openLabel = formatSyncClock(
      `${String(Math.floor(lastEnd / 60)).padStart(2, "0")}:${String(lastEnd % 60).padStart(2, "0")}`,
    );
    if (openLabel) {
      lines.push(`You have open time after ${openLabel} today.`);
    }
  }

  const filtered = filterBriefLines(lines, lede);
  if (todayParagraph) {
    return filtered
      .filter(
        (line) =>
          !splitBriefSentences(todayParagraph).some((sentence) =>
            briefFactsOverlap(sentence, line),
          ),
      )
      .slice(0, 1);
  }

  return filtered.slice(0, 1);
}

type BriefHighlight = { priority: number; text: string };

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

function collectBriefHighlights(
  items: CapturedSyncItem[],
  blocks: SyncTimeBlock[],
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
  priorities: string[],
) {
  const highlights: BriefHighlight[] = [];

  const priorityBias = (item: CapturedSyncItem, base: number) =>
    base + profilePriorityBoost(item, priorities);

  for (const item of items.filter(activeItem)) {
    const key = resolveCaptureDateKey(item, reference);
    const days = daysUntil(key, reference);

    if (isPaydayItem(item) && days != null && days >= 0 && days <= 21) {
      const phrase = paydayPhrase(item, reference);
      if (phrase) {
        highlights.push({
          priority: priorityBias(
            item,
            days <= 1 ? 4 + days : 10 + days,
          ),
          text: `${phrase}.`,
        });
      }
      continue;
    }

    if (
      item.timeline?.timelineRole === "deadline" ||
      (item.category === "reminder" && item.destinations.includes("Finance"))
    ) {
      const phrase = friendlyDeadline(item, reference);
      if (phrase && days != null && days >= 0 && days <= 14) {
        highlights.push({
          priority: priorityBias(
            item,
            days === 0 ? 2 : days === 1 ? 5 : 12 + days,
          ),
          text: `${phrase}.`,
        });
      }
    }

    if (isFamilyItem(item)) {
      const phrase = friendlyDeadline(item, reference);
      if (phrase && days != null && days >= 0 && days <= 30) {
        highlights.push({
          priority: priorityBias(item, 14 + days),
          text: `${phrase}.`,
        });
      }
    }
  }

  const healthGap = describeHealthGap(items, reference);
  if (healthGap) {
    highlights.push({ priority: 32, text: healthGap });
  }

  const todayKey = toDateKey(reference);
  const todayTimed = timedBlocksForDate(blocks, todayKey);
  const todayWork = todayTimed.filter((block) => block.area === "work");
  const workBlock =
    todayWork.find((block) => block.blockType === "schedule") ?? todayWork[0];

  if (workBlock?.startTime) {
    highlights.push({
      priority: 20,
      text: `Work starts at ${formatSyncClock(workBlock.startTime)}.`,
    });
  } else if (
    workSchedule &&
    dayMatchesScheduleDay(reference.getDay(), workSchedule.days)
  ) {
    highlights.push({
      priority: 20,
      text: `Work starts at ${formatSyncClock(workSchedule.startTime)}.`,
    });
  }

  const personalToday = todayTimed.filter(
    (block) => block.area !== "work" && block.blockType !== "schedule",
  );
  for (const block of personalToday.slice(0, 1)) {
    const time = formatSyncClock(block.startTime);
    highlights.push({
      priority: 8,
      text: time
        ? `${block.title} at ${time} today.`
        : `${block.title} is today.`,
    });
  }

  return highlights.sort((a, b) => a.priority - b.priority);
}

function buildBriefLede(
  items: CapturedSyncItem[],
  blocks: SyncTimeBlock[],
  workSchedule: PersistedWorkSchedule | null | undefined,
  reference: Date,
  priorities: string[],
) {
  const highlights = collectBriefHighlights(
    items,
    blocks,
    workSchedule,
    reference,
    priorities,
  );
  if (highlights.length > 0) {
    return highlights[0].text;
  }

  return "Here's what matters right now.";
}

export function loadPreferredName(): string | null {
  const name = loadUserProfile().name.trim();
  return name || null;
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

  const todayParagraph = buildTodayParagraph(
    blocks,
    activeItems,
    workSchedule,
    reference,
    lede,
  );
  const noticingParagraphs = buildNoticingParagraphs(
    blocks,
    activeItems,
    reference,
    lede,
  );
  const possibilityParagraphs = buildPossibilityParagraphs(
    blocks,
    reference,
    lede,
    todayParagraph,
  );

  const sections: BriefSection[] = [];

  if (todayParagraph) {
    const todayBody = joinBriefSentences(
      filterBriefLines(splitBriefSentences(todayParagraph), lede),
    );
    if (todayBody) {
      sections.push({ id: "today", paragraphs: [todayBody] });
    }
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

  const hasHeadline =
    lede !== "Here's what matters right now." && lede.trim().length > 0;
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
