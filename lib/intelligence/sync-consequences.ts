import { toDateKey } from "@/lib/calendar-utils";
import { isRelationshipCapture, resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  importanceToPriorityBoost,
  scoreMemoryImportance,
} from "@/lib/intelligence/importance-scoring";
import { composeCuratedBrief } from "@/lib/intelligence/briefing-composer";
import {
  BRIEF_EMPTY_NO_CONTEXT,
  BRIEF_EMPTY_QUIET,
} from "@/lib/mobile-prototype/sync-voice";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { conflictPriorityScore } from "@/lib/trust/conflict-priority";
import {
  collectWorkDayOffDateKeys,
  isWorkDayOffItem,
} from "@/lib/sync-capture/work-availability";
import {
  buildSyncTimeBlocksForRange,
  formatSyncClock,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import { generateHomeAmbientInsight } from "@/lib/time-block-insights";
import { isBriefEligibleMemory, resolveNextOccurrenceDateKey } from "@/lib/timeline/next-occurrence";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { dayMatchesScheduleDay } from "@/lib/user-timeline-context";
import type { SyncUserProfile } from "@/lib/sync-profile/user-profile";

export type ConsequenceKind =
  | "relationship_moment"
  | "family_moment"
  | "financial_due"
  | "income"
  | "work_off"
  | "work_start"
  | "work_stretch"
  | "deadline"
  | "event"
  | "time_opens"
  | "ambient"
  | "health_log"
  | "day_synthesis";

export type ConsequenceHorizon = "headline" | "coming_soon" | "background";

export type SyncConsequence = {
  id: string;
  sourceMemoryId: string | null;
  kind: ConsequenceKind;
  surfaceText: string;
  daysUntil: number | null;
  dateKey: string | null;
  priority: number;
  horizon: ConsequenceHorizon;
  area: string;
  briefEligible: boolean;
  sortMinutes?: number | null;
};

export type DailyBriefFromConsequences = {
  userName: string | null;
  lede: string;
  sections: Array<{
    id: "noticing";
    label?: string;
    paragraphs: string[];
  }>;
  isEmpty: boolean;
  consequences: SyncConsequence[];
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function activeItem(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

export function daysUntilDateKey(dateKey: string | null, reference: Date) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function weekdayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
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

function isPaydayItem(item: CapturedSyncItem) {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  return (
    item.moneyType === "income" ||
    /\b(payday|pay day|get paid|paycheck|every other)\b/.test(text) ||
    displayMemoryTitle(item) === "Payday"
  );
}

function isDeadlineMemory(item: CapturedSyncItem) {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  return (
    item.timeline?.timelineRole === "deadline" ||
    (item.category === "reminder" && /\b(due|rent|bill)\b/.test(text))
  );
}

function isBirthdayMemory(item: CapturedSyncItem) {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  return /\b(birthday|bday)\b/.test(text);
}

function isAnniversaryMemory(item: CapturedSyncItem) {
  return /\banniversary\b/i.test(`${item.title} ${item.originalPrompt ?? item.prompt}`);
}

const RELATION_POSSESSIVE: Record<string, string> = {
  friend: "Your friend's birthday",
  friends: "Your friend's birthday",
  girlfriend: "Your girlfriend's birthday",
  girlfrienda: "Your girlfriend's birthday",
  boyfriend: "Your boyfriend's birthday",
  partner: "Your partner's birthday",
  wife: "Your wife's birthday",
  husband: "Your husband's birthday",
  mom: "Your mom's birthday",
  mother: "Your mom's birthday",
  moms: "Your mom's birthday",
  dad: "Your dad's birthday",
  father: "Your dad's birthday",
  dads: "Your dad's birthday",
  sister: "Your sister's birthday",
  brother: "Your brother's birthday",
  daughter: "Your daughter's birthday",
  son: "Your son's birthday",
  grandma: "Your grandma's birthday",
  grandpa: "Your grandpa's birthday",
};

function extractBirthdaySubject(prompt: string): string | null {
  const text = prompt.trim();

  const friendMatch = text.match(
    /\bmy\s+(friend(?:'s)?|friends?'?s?)\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i,
  );
  if (friendMatch) return "Your friend's birthday";

  const possessiveMatch = text.match(
    /\bmy\s+([a-z]+(?:'s)?)\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i,
  );
  if (possessiveMatch?.[1]) {
    const key = possessiveMatch[1].toLowerCase().replace(/'s$/, "");
    if (RELATION_POSSESSIVE[key]) return RELATION_POSSESSIVE[key];
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    return `Your ${label}'s birthday`;
  }

  const titled = displayMemoryTitle({ title: "", prompt: text, category: "task" });
  if (titled.endsWith("'s Birthday")) {
    const name = titled.replace(/'s Birthday$/, "");
    if (/^(Mom|Dad|Girlfriend|Boyfriend|Friend)$/i.test(name)) {
      return RELATION_POSSESSIVE[name.toLowerCase()] ?? `Your ${name.toLowerCase()}'s birthday`;
    }
    return `${name}'s birthday`;
  }

  return null;
}

function deadlineSubject(item: CapturedSyncItem) {
  const prompt = (item.originalPrompt ?? item.prompt).toLowerCase();
  if (/\brent\b/.test(prompt) && /\b(due|pay)\b/.test(prompt)) return "Rent";
  const title = displayMemoryTitle(item);
  if (/\bdue$/i.test(title)) return title.replace(/\s+due$/i, "").trim();
  return displayMemoryTitle(item);
}

function timedMomentPhrase(subject: string, days: number, dateKey: string | null) {
  if (days === 0) return `${subject} is today`;
  if (days === 1) return `${subject} is tomorrow`;
  if (days >= 2 && days <= 7 && dateKey) {
    return `${subject} is ${weekdayLabel(dateKey)}`;
  }
  if (days <= 14) return `${subject} is in ${days} days`;
  return null;
}

function dueMomentPhrase(subject: string, days: number, dateKey: string | null) {
  if (days === 0) return `${subject} is due today`;
  if (days === 1) return `${subject} is due tomorrow`;
  if (days >= 2 && days <= 7 && dateKey) {
    return `${subject} is due ${weekdayLabel(dateKey)}`;
  }
  if (days <= 14) return `${subject} is due in ${days} days`;
  return null;
}

function profileBoost(item: CapturedSyncItem, priorities: string[]) {
  if (priorities.length === 0) return 0;
  let boost = 0;
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();

  const checks: Array<[string, RegExp]> = [
    ["Family", /\b(mom|dad|family|birthday|daughter|son)\b/],
    ["Relationships", /\b(friend|girlfriend|boyfriend|partner|anniversary)\b/],
    ["Money", /\b(payday|rent|bill|paid)\b/],
    ["Health", /\b(gym|workout|health)\b/],
    ["Work", /\b(work|shift|overtime|flight)\b/],
  ];

  checks.forEach(([priority, pattern], index) => {
    if (priorities.includes(priority) && pattern.test(text)) {
      boost -= (priorities.length - index) * 4;
    }
  });

  return boost;
}

function importanceBoost(
  item: CapturedSyncItem | null,
  reference: Date,
  priorities: string[] = [],
): number {
  if (!item) return 0;
  const level = scoreMemoryImportance(item, reference, priorities);
  return importanceToPriorityBoost(level);
}

function conflictScoreBoost(item: CapturedSyncItem | null): number {
  if (!item) return 0;
  const score = conflictPriorityScore({
    importance: item.meaning?.importance ?? "medium",
    protected: item.protectedTime?.enabled === true,
    blockType: item.timeline?.timelineRole === "schedule" ? "schedule" : "event",
    area: item.destinations.includes("School")
      ? "school"
      : item.destinations.includes("Family")
        ? "family"
        : item.destinations.includes("Work")
          ? "work"
          : "calendar",
    category: item.category,
    title: item.title,
    prompt: item.originalPrompt ?? item.prompt,
    destinations: item.destinations,
  });
  return -Math.min(Math.floor(score / 50), 12);
}

function memoryPriority(
  item: CapturedSyncItem,
  days: number,
  kind: ConsequenceKind,
  priorities: string[],
  reference = new Date(),
) {
  let base = 80;

  if (kind === "relationship_moment" || kind === "family_moment") {
    if (days === 0) base = 2;
    else if (days === 1) base = 4;
    else if (days <= 7) base = 10 + days;
    else base = 20;
  } else if (kind === "work_off") {
    if (days === 0) base = 5;
    else if (days === 1) base = 7;
    else base = 12;
  } else if (kind === "financial_due" || kind === "deadline") {
    if (days === 0) base = 6;
    else if (days === 1) base = 8;
    else if (days <= 7) base = 12 + days;
    else base = 22;
  } else if (kind === "income") {
    if (days === 0) base = 10;
    else if (days === 1) base = 14;
    else if (days <= 3) base = 18;
    else if (days <= 7) base = 24;
    else base = 34;
  } else if (kind === "event") {
    if (days === 0) base = 12;
    else if (days === 1) base = 16;
    else base = 22 + Math.min(days, 7);
  } else if (kind === "health_log") {
    base = 72;
  }

  return (
    base +
    profileBoost(item, priorities) +
    importanceBoost(item, reference, priorities) +
    conflictScoreBoost(item)
  );
}

function resolveMemoryDateKey(item: CapturedSyncItem, reference: Date) {
  const nextKey = item.timeline
    ? resolveNextOccurrenceDateKey(item.timeline, reference)
    : null;
  return nextKey ?? resolveCaptureDateKey(item, reference);
}

function makeConsequence(
  partial: Omit<SyncConsequence, "id"> & { id?: string },
): SyncConsequence {
  const id =
    partial.id ??
    `${partial.sourceMemoryId ?? "schedule"}-${partial.kind}-${partial.dateKey ?? "open"}`;
  return { ...partial, id };
}

export function deriveConsequencesFromMemory(
  item: CapturedSyncItem,
  reference = new Date(),
  priorities: string[] = [],
): SyncConsequence[] {
  if (!activeItem(item)) return [];

  const prompt = item.originalPrompt ?? item.prompt;
  const dateKey = resolveMemoryDateKey(item, reference);
  const days = daysUntilDateKey(dateKey, reference);
  const nextKey = item.timeline
    ? resolveNextOccurrenceDateKey(item.timeline, reference)
    : dateKey;
  const briefEligible = isBriefEligibleMemory(item, reference, nextKey);
  const consequences: SyncConsequence[] = [];

  if (isMinorLog(item)) {
    return [];
  }

  if (isWorkDayOffItem(item) && days != null && days >= 0 && days <= 1) {
    const text =
      days === 0
        ? "You're off today"
        : days === 1
          ? "You're off tomorrow"
          : null;
    if (text) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: item.id,
          kind: "work_off",
          surfaceText: `${text}.`,
          daysUntil: days,
          dateKey,
          priority: memoryPriority(item, days, "work_off", priorities, reference),
          horizon: "headline",
          area: "work",
          briefEligible: true,
        }),
      );
    }
    return consequences;
  }

  if (isBirthdayMemory(item) && days != null && days >= 0 && days <= 14) {
    const subject =
      extractBirthdaySubject(prompt) ??
      `${displayMemoryTitle(item).replace(/'s Birthday$/, "'s birthday")}`;
    const kind = isRelationshipCapture(item) ? "relationship_moment" : "family_moment";
    const phrase = timedMomentPhrase(subject, days, dateKey);
    if (phrase && days <= 14) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: item.id,
          kind,
          surfaceText: `${phrase}.`,
          daysUntil: days,
          dateKey,
          priority: memoryPriority(item, days, kind, priorities, reference),
          horizon: days <= 1 ? "headline" : "coming_soon",
          area: kind === "relationship_moment" ? "relationships" : "family",
          briefEligible,
        }),
      );
    }
    return consequences;
  }

  if (isAnniversaryMemory(item) && days != null && days >= 0 && days <= 14) {
    const phrase = timedMomentPhrase("Your anniversary", days, dateKey);
    if (phrase) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: item.id,
          kind: "relationship_moment",
          surfaceText: `${phrase}.`,
          daysUntil: days,
          dateKey,
          priority: memoryPriority(item, days, "relationship_moment", priorities, reference),
          horizon: days <= 1 ? "headline" : "coming_soon",
          area: "relationships",
          briefEligible,
        }),
      );
    }
    return consequences;
  }

  if (isPaydayItem(item) && days != null && days >= 0 && days <= 21) {
    const phrase =
      days === 0
        ? "Payday is today"
        : days === 1
          ? "Payday is tomorrow"
          : days <= 7 && dateKey
            ? `Payday lands ${weekdayLabel(dateKey)}`
            : `Payday is in ${days} days`;
    consequences.push(
      makeConsequence({
        sourceMemoryId: item.id,
        kind: "income",
        surfaceText: `${phrase}.`,
        daysUntil: days,
        dateKey,
        priority: memoryPriority(item, days, "income", priorities, reference),
        horizon: days <= 1 ? "headline" : "coming_soon",
        area: "finance",
        briefEligible,
      }),
    );
    return consequences;
  }

  if (isDeadlineMemory(item) && days != null && days >= 0 && days <= 7) {
    const subject = deadlineSubject(item);
    const phrase = dueMomentPhrase(subject, days, dateKey);
    if (phrase) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: item.id,
          kind: "financial_due",
          surfaceText: `${phrase}.`,
          daysUntil: days,
          dateKey,
          priority: memoryPriority(item, days, "financial_due", priorities, reference),
          horizon: days <= 1 ? "headline" : "coming_soon",
          area: "finance",
          briefEligible,
        }),
      );
    }
    return consequences;
  }

  if (days != null && days >= 0 && days <= 21 && dateKey) {
    const hasTimedStart = Boolean(item.timeline?.isTimed && item.timeline?.startTime);
    if (!hasTimedStart) {
      const subject = displayMemoryTitle(item);
      const phrase = timedMomentPhrase(subject, days, dateKey);
      if (phrase) {
        consequences.push(
          makeConsequence({
            sourceMemoryId: item.id,
            kind: "event",
            surfaceText: `${phrase}.`,
            daysUntil: days,
            dateKey,
            priority: memoryPriority(item, days, "event", priorities, reference),
            horizon: days <= 1 ? "headline" : days <= 7 ? "coming_soon" : "background",
            area: "calendar",
            briefEligible,
          }),
        );
      }
    }
  }

  return consequences;
}

function isWorkScheduleBlock(block: SyncTimeBlock) {
  return block.blockType === "schedule" || block.title === "Work";
}

function demoteHeadlinesWhenDaySynthesis(
  consequences: SyncConsequence[],
): SyncConsequence[] {
  const synthesis = consequences.find(
    (c) => c.kind === "day_synthesis" && c.horizon === "headline",
  );
  if (!synthesis || synthesis.daysUntil !== 1) return consequences;

  return consequences.map((consequence) => {
    if (consequence.id === synthesis.id) return consequence;
    if (consequence.horizon === "headline" && consequence.daysUntil === 1) {
      return {
        ...consequence,
        horizon: "coming_soon" as const,
        sortMinutes: consequence.sortMinutes ?? 12 * 60,
      };
    }
    return consequence;
  });
}

function blockConsequenceKind(
  block: SyncTimeBlock,
  item: CapturedSyncItem | null,
): ConsequenceKind {
  if (block.area === "school" || block.area === "family") return "family_moment";
  if (isRelationshipCapture(item ?? { destinations: block.destinations } as CapturedSyncItem)) {
    return "relationship_moment";
  }
  if (item && isPaydayItem(item)) return "income";
  if (item && isDeadlineMemory(item)) return "financial_due";
  return "event";
}

function formatTimedBlockSurfaceText(
  block: SyncTimeBlock,
  item: CapturedSyncItem | null,
  days: number,
) {
  const prompt = (item?.originalPrompt ?? item?.prompt ?? block.title).toLowerCase();
  const time = formatSyncClock(block.startTime);
  const title = item ? displayMemoryTitle(item) : block.title;

  if (/\bflight\b/.test(prompt) || /\bflight\b/i.test(title)) {
    if (days === 1 && time) return `Flight at ${time}.`;
    if (days === 0 && time) return `Flight at ${time} today.`;
  }

  const takeChild = prompt.match(/\btake\s+(?:my\s+)?(daughter|son)\s+to\s+school\b/);
  if (takeChild) {
    const child = takeChild[1];
    if (days === 1) {
      return time
        ? `Take ${child} to school at ${time}.`
        : `Take ${child} to school tomorrow.`;
    }
    if (days === 0) {
      return time ? `Take ${child} to school at ${time}.` : `Take ${child} to school today.`;
    }
  }

  if (/\b(drop[- ]?off|pick[- ]?up)\b/.test(prompt)) {
    const child = /\bdaughter\b/.test(prompt)
      ? "daughter"
      : /\bson\b/.test(prompt)
        ? "son"
        : null;
    if (child) {
      if (days === 1) {
        return time
          ? `Take ${child} to school at ${time}.`
          : `Take ${child} to school tomorrow.`;
      }
      if (days === 0) {
        return time ? `Take ${child} to school at ${time}.` : `Take ${child} to school today.`;
      }
    }
  }

  if (days === 0) return time ? `${title} at ${time} today.` : `${title} is today.`;
  if (days === 1) return time ? `${title} at ${time}.` : `${title} is tomorrow.`;
  if (days <= 7) {
    return time
      ? `${title} at ${time} ${weekdayLabel(block.date)}.`
      : `${title} is ${weekdayLabel(block.date)}.`;
  }
  return time ? `${title} at ${time}.` : `${title} is in ${days} days.`;
}

function deriveTimedBlockConsequences(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  reference: Date,
  priorities: string[],
): SyncConsequence[] {
  const itemById = new Map(items.map((item) => [item.id, item]));

  return blocks
    .filter((block) => {
      if (!block.isTimed || !block.startTime) return false;
      if (isWorkScheduleBlock(block)) return false;
      const days = daysUntilDateKey(block.date, reference);
      return days != null && days >= 0 && days <= 7;
    })
    .map((block) => {
      const item = block.sourceItemId ? (itemById.get(block.sourceItemId) ?? null) : null;
      const days = daysUntilDateKey(block.date, reference)!;
      const kind = blockConsequenceKind(block, item);
      const startMinutes = clockToMinutes(block.startTime);
      const stub = item ?? ({
        id: block.sourceItemId ?? block.id,
        title: block.title,
        category: "task",
        prompt: block.title,
        destinations: block.destinations,
        status: "active",
        createdAt: "",
        updatedAt: "",
        dateLabel: "",
        timeLabel: "",
      } as CapturedSyncItem);

      return makeConsequence({
        sourceMemoryId: block.sourceItemId ?? null,
        kind,
        surfaceText: formatTimedBlockSurfaceText(block, item, days),
        daysUntil: days,
        dateKey: block.date,
        priority: memoryPriority(stub, days, kind, priorities, reference),
        horizon: "coming_soon",
        area: block.area,
        briefEligible: true,
        sortMinutes: startMinutes,
      });
    });
}

function deriveContextualConsequences(
  items: CapturedSyncItem[],
  reference: Date,
  priorities: string[],
): SyncConsequence[] {
  const consequences: SyncConsequence[] = [];

  for (const item of items.filter(activeItem)) {
    const prompt = item.originalPrompt ?? item.prompt;
    const dateKey = resolveMemoryDateKey(item, reference);
    const days = daysUntilDateKey(dateKey, reference);
    if (days == null || days < 0 || days > 7) continue;

    if (/\bflight\b/i.test(prompt) && days === 1) {
      const minutes = clockToMinutes(item.timeline?.startTime);
      if (minutes != null && minutes < 7 * 60) {
        consequences.push(
          makeConsequence({
            sourceMemoryId: item.id,
            kind: "event",
            surfaceText: "Early flight tomorrow — tonight may need extra prep.",
            daysUntil: 1,
            dateKey,
            priority: 14,
            horizon: "coming_soon",
            area: "calendar",
            briefEligible: true,
            sortMinutes: 5 * 60,
          }),
        );
      }
    }

    if (
      /\btake\s+(?:my\s+)?(daughter|son)\s+to\s+school\b/i.test(prompt) &&
      days === 1
    ) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: item.id,
          kind: "family_moment",
          surfaceText: "This affects your morning availability tomorrow.",
          daysUntil: 1,
          dateKey,
          priority: 13,
          horizon: "coming_soon",
          area: "family",
          briefEligible: true,
          sortMinutes: 8 * 60,
        }),
      );
    }

    if (isWorkDayOffItem(item) && days === 1) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: item.id,
          kind: "work_off",
          surfaceText: "Tomorrow stays open unless other plans fill it.",
          daysUntil: 1,
          dateKey,
          priority: 16,
          horizon: "coming_soon",
          area: "work",
          briefEligible: true,
          sortMinutes: 10 * 60,
        }),
      );
    }

    if (isDeadlineMemory(item) && days >= 2 && days <= 7) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: item.id,
          kind: "financial_due",
          surfaceText: "Finance deadline within the week.",
          daysUntil: days,
          dateKey,
          priority: 22,
          horizon: "coming_soon",
          area: "finance",
          briefEligible: true,
          sortMinutes: 12 * 60,
        }),
      );
    }
  }

  return consequences;
}

function finalizeDaySynthesis(
  consequences: SyncConsequence[],
  reference: Date,
): SyncConsequence[] {
  const tomorrowKey = toDateKey(addDays(reference, 1));
  const tomorrow = consequences.filter(
    (consequence) =>
      consequence.daysUntil === 1 &&
      consequence.briefEligible &&
      consequence.kind !== "day_synthesis" &&
      consequence.kind !== "ambient",
  );

  if (tomorrow.length === 0) return consequences;

  const timed = tomorrow.filter((consequence) => consequence.sortMinutes != null);
  const earliest = timed.length
    ? Math.min(...timed.map((consequence) => consequence.sortMinutes!))
    : null;

  let synthesis: SyncConsequence | null = null;

  if (earliest != null && earliest < 7 * 60) {
    synthesis = makeConsequence({
      sourceMemoryId: null,
      kind: "day_synthesis",
      surfaceText: "Tomorrow starts early.",
      daysUntil: 1,
      dateKey: tomorrowKey,
      priority: 3,
      horizon: "headline",
      area: "calendar",
      briefEligible: true,
      sortMinutes: earliest,
    });
  } else if (tomorrow.length >= 4) {
    synthesis = makeConsequence({
      sourceMemoryId: null,
      kind: "day_synthesis",
      surfaceText: "Tomorrow looks busy.",
      daysUntil: 1,
      dateKey: tomorrowKey,
      priority: 3,
      horizon: "headline",
      area: "calendar",
      briefEligible: true,
    });
  }

  if (!synthesis) return consequences;

  const withoutSynthesis = consequences.filter(
    (consequence) => consequence.kind !== "day_synthesis",
  );
  return demoteHeadlinesWhenDaySynthesis([...withoutSynthesis, synthesis]);
}

function clockToMinutes(value?: string) {
  if (!value) return null;
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function latestBlockEnd(blocks: SyncTimeBlock[]) {
  let latest = 0;
  for (const block of blocks) {
    const end = clockToMinutes(block.endTime) ?? clockToMinutes(block.startTime);
    if (end != null && end > latest) latest = end;
  }
  return latest;
}

export function deriveScheduleConsequences(options: {
  blocks: SyncTimeBlock[];
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
}): SyncConsequence[] {
  const reference = options.reference ?? new Date();
  const workSchedule = options.workSchedule ?? null;
  const dayOffDates = collectWorkDayOffDateKeys(options.items, reference);
  const todayKey = toDateKey(reference);
  const tomorrowKey = toDateKey(addDays(reference, 1));
  const consequences: SyncConsequence[] = [];

  const todayWork = options.blocks.filter(
    (block) =>
      block.date === todayKey && block.area === "work" && block.isTimed && block.startTime,
  );
  const workOffToday = dayOffDates.has(todayKey);

  const workBlock =
    todayWork.find((block) => block.blockType === "schedule") ?? todayWork[0];

  if (!workOffToday && workBlock?.startTime) {
    consequences.push(
      makeConsequence({
        sourceMemoryId: null,
        kind: "work_start",
        surfaceText: `Work starts at ${formatSyncClock(workBlock.startTime)}.`,
        daysUntil: 0,
        dateKey: todayKey,
        priority: 20,
        horizon: "headline",
        area: "work",
        briefEligible: true,
      }),
    );
  } else if (
    !workOffToday &&
    workSchedule &&
    dayMatchesScheduleDay(reference.getDay(), workSchedule.days)
  ) {
    consequences.push(
      makeConsequence({
        sourceMemoryId: null,
        kind: "work_start",
        surfaceText: `Work starts at ${formatSyncClock(workSchedule.startTime)}.`,
        daysUntil: 0,
        dateKey: todayKey,
        priority: 20,
        horizon: "headline",
        area: "work",
        briefEligible: true,
      }),
    );
  }

  const workEnd = latestBlockEnd(todayWork);
  if (workEnd > 0 && workEnd < 21 * 60) {
    const openLabel = formatSyncClock(
      `${String(Math.floor(workEnd / 60)).padStart(2, "0")}:${String(workEnd % 60).padStart(2, "0")}`,
    );
    if (openLabel) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: null,
          kind: "time_opens",
          surfaceText: `Your evening opens after ${openLabel}.`,
          daysUntil: 0,
          dateKey: todayKey,
          priority: 28,
          horizon: "headline",
          area: "calendar",
          briefEligible: true,
        }),
      );
    }
  }

  if (!dayOffDates.has(tomorrowKey) && workSchedule?.days?.length) {
    const tomorrow = addDays(reference, 1);
    if (dayMatchesScheduleDay(tomorrow.getDay(), workSchedule.days)) {
      const tomorrowTimedWork = options.blocks.filter(
        (block) =>
          block.date === tomorrowKey &&
          block.area === "work" &&
          block.isTimed &&
          block.startTime,
      );
      const tomorrowWorkBlock =
        tomorrowTimedWork.find((block) => block.blockType === "schedule") ??
        tomorrowTimedWork[0];

      if (tomorrowWorkBlock?.startTime) {
        consequences.push(
          makeConsequence({
            sourceMemoryId: null,
            kind: "work_start",
            surfaceText: `Work starts at ${formatSyncClock(tomorrowWorkBlock.startTime)}.`,
            daysUntil: 1,
            dateKey: tomorrowKey,
            priority: 24,
            horizon: "coming_soon",
            area: "work",
            briefEligible: true,
            sortMinutes: clockToMinutes(tomorrowWorkBlock.startTime) ?? undefined,
          }),
        );
      } else if (workSchedule.startTime) {
        consequences.push(
          makeConsequence({
            sourceMemoryId: null,
            kind: "work_start",
            surfaceText: `Work starts at ${formatSyncClock(workSchedule.startTime)}.`,
            daysUntil: 1,
            dateKey: tomorrowKey,
            priority: 24,
            horizon: "coming_soon",
            area: "work",
            briefEligible: true,
            sortMinutes: clockToMinutes(workSchedule.startTime) ?? undefined,
          }),
        );
      }

      const tomorrowWork = options.blocks.filter(
        (block) => block.date === tomorrowKey && block.area === "work",
      );
      const workEndTomorrow = latestBlockEnd(tomorrowWork);
      if (workEndTomorrow > 0) {
        const openLabel = formatSyncClock(
          `${String(Math.floor(workEndTomorrow / 60)).padStart(2, "0")}:${String(workEndTomorrow % 60).padStart(2, "0")}`,
        );
        if (openLabel) {
          consequences.push(
            makeConsequence({
              sourceMemoryId: null,
              kind: "time_opens",
              surfaceText: `Tomorrow is open after ${openLabel}.`,
              daysUntil: 1,
              dateKey: tomorrowKey,
              priority: 26,
              horizon: "coming_soon",
              area: "calendar",
              briefEligible: true,
            }),
          );
        }
      }
    }
  }

  if (workSchedule?.days?.length) {
    let count = 0;
    for (let offset = 1; offset <= 3; offset += 1) {
      const date = addDays(reference, offset);
      const dateKey = toDateKey(date);
      if (dayOffDates.has(dateKey)) continue;
      if (dayMatchesScheduleDay(date.getDay(), workSchedule.days)) count += 1;
    }
    if (count >= 3) {
      consequences.push(
        makeConsequence({
          sourceMemoryId: null,
          kind: "work_stretch",
          surfaceText: "You work the next three days.",
          daysUntil: 2,
          dateKey: null,
          priority: 32,
          horizon: "coming_soon",
          area: "work",
          briefEligible: true,
        }),
      );
    }
  }

  const ambient = generateHomeAmbientInsight(
    options.blocks,
    options.items,
    reference,
  );
  if (
    ambient &&
    !/worth a spot|haven't logged exercise|tomorrow is mostly open/i.test(ambient)
  ) {
    consequences.push(
      makeConsequence({
        sourceMemoryId: null,
        kind: "ambient",
        surfaceText: ambient.endsWith(".") ? ambient : `${ambient}.`,
        daysUntil: null,
        dateKey: null,
        priority: 70,
        horizon: "background",
        area: "calendar",
        briefEligible: true,
      }),
    );
  }

  return consequences;
}

function suppressRedundantFinanceHints(
  consequences: SyncConsequence[],
): SyncConsequence[] {
  const specificFinanceMemories = new Set(
    consequences
      .filter(
        (consequence) =>
          consequence.kind === "financial_due" &&
          consequence.surfaceText !== "Finance deadline within the week.",
      )
      .map((consequence) => consequence.sourceMemoryId)
      .filter((id): id is string => Boolean(id)),
  );

  return consequences.filter((consequence) => {
    if (consequence.surfaceText !== "Finance deadline within the week.") {
      return true;
    }
    return !(
      consequence.sourceMemoryId &&
      specificFinanceMemories.has(consequence.sourceMemoryId)
    );
  });
}

export function buildAllConsequences(options: {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  lifeProfile?: SyncUserProfile | null;
}): SyncConsequence[] {
  const reference = options.reference ?? new Date();
  const priorities = options.lifeProfile?.priorities ?? [];
  const activeItems = options.items.filter(activeItem);

  const end = addDays(reference, 21);
  const blocks = buildSyncTimeBlocksForRange({
    items: activeItems,
    startDate: reference,
    endDate: end,
    reference,
    workSchedule: options.workSchedule ?? null,
  });

  const memoryConsequences = activeItems.flatMap((item) =>
    deriveConsequencesFromMemory(item, reference, priorities),
  );

  const scheduleConsequences = deriveScheduleConsequences({
    blocks,
    items: activeItems,
    workSchedule: options.workSchedule ?? null,
    reference,
  });

  const timedConsequences = deriveTimedBlockConsequences(
    blocks,
    activeItems,
    reference,
    priorities,
  );

  const contextualConsequences = deriveContextualConsequences(
    activeItems,
    reference,
    priorities,
  );

  return finalizeDaySynthesis(
    suppressRedundantFinanceHints([
      ...memoryConsequences,
      ...timedConsequences,
      ...contextualConsequences,
      ...scheduleConsequences,
    ]),
    reference,
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
    "open after",
    "birthday",
    "rent",
    "off tomorrow",
    "off today",
  ];

  return sharedTopics.some(
    (topic) => left.includes(topic) && right.includes(topic),
  );
}

function isVagueConsequence(text: string) {
  const normalized = text.toLowerCase();
  return (
    /worth a (quick )?check/.test(normalized) ||
    /worth a spot/.test(normalized) ||
    /worth noticing/.test(normalized) ||
    /haven't logged exercise/.test(normalized) ||
    /exercise in \d+ days/.test(normalized)
  );
}

function shouldShowInComingSoon(consequence: SyncConsequence) {
  if (!consequence.briefEligible) return false;
  if (consequence.horizon !== "coming_soon") return false;
  if (isVagueConsequence(consequence.surfaceText)) return false;
  if (consequence.kind === "day_synthesis") return false;
  if (consequence.kind === "health_log") return false;
  if (consequence.kind === "work_start") {
    return (consequence.daysUntil ?? 99) <= 1;
  }
  if (
    /\b\d{1,2}:\d{2}\s*(AM|PM)?\s+work\b/i.test(consequence.surfaceText) ||
    /\btomorrow:\s*\d/i.test(consequence.surfaceText)
  ) {
    return false;
  }
  return true;
}

export function composeDailyBriefFromConsequences(
  consequences: SyncConsequence[],
  options: {
    userName?: string | null;
    hasUserContext: boolean;
    priorities?: string[];
  },
): DailyBriefFromConsequences {
  const userName = options.userName ?? null;

  const curated = composeCuratedBrief({
    consequences,
    priorities: options.priorities ?? [],
    hasUserContext: options.hasUserContext,
    emptyNoContext: BRIEF_EMPTY_NO_CONTEXT,
    emptyQuiet: BRIEF_EMPTY_QUIET,
  });

  return {
    userName,
    lede: curated.lede,
    sections: curated.sections,
    isEmpty: curated.isEmpty,
    consequences,
  };
}

export function buildConsequenceBrief(input: {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  userName?: string | null;
  lifeProfile?: SyncUserProfile | null;
}): DailyBriefFromConsequences {
  const reference = input.reference ?? new Date();
  const activeItems = input.items.filter(activeItem);
  const lifeProfile = input.lifeProfile ?? null;
  const userName = input.userName ?? lifeProfile?.name ?? null;

  const hasUserContext =
    activeItems.length > 0 ||
    input.workSchedule != null ||
    Boolean(
      lifeProfile?.onboardingComplete &&
        (lifeProfile.typicalWeek.trim() ||
          lifeProfile.comingUp.trim() ||
          lifeProfile.name.trim()),
    );

  const consequences = buildAllConsequences({
    items: input.items,
    workSchedule: input.workSchedule,
    reference,
    lifeProfile,
  });

  return composeDailyBriefFromConsequences(consequences, {
    userName,
    hasUserContext,
    priorities: lifeProfile?.priorities ?? [],
  });
}
