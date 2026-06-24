import type { CapturedSyncItem } from "@/lib/captured-items";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import {
  buildMemoryProfile,
} from "@/lib/intelligence/memory-profile";
import {
  itemsInSameThread,
  resolveMemoryThread,
} from "@/lib/intelligence/memory-thread";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { daysUntilDateKey } from "@/lib/intelligence/sync-consequences";
import {
  assessTomorrowLoad,
} from "@/lib/intelligence/life-load";
import { formatSyncClock, type SyncTimeBlock } from "@/lib/sync-time-blocks";
import {
  CONTEXT_EMOTION_NOTED_TODAY,
  CONTEXT_EMOTION_STRESS_PATTERN,
  CONTEXT_PAYDAY_BEFORE_FLIGHT,
  CONTEXT_PAYDAY_BEFORE_RENT,
  FORECAST_MONEY_BEFORE_RENT,
  FORECAST_NOTHING_NEEDS_ATTENTION,
  FORECAST_PEOPLE_THIS_WEEK,
  FORECAST_QUIET_EVENING,
  FORECAST_QUIET_AFTER,
  FORECAST_SHARPEN,
  FORECAST_SPACE_EVENING,
  FORECAST_TOMORROW_EARLY,
  FORECAST_TOMORROW_MORNING_PACKED,
  FORECAST_WORK_ANCHORS,
  HOME_EMPTY_HEADLINE,
} from "@/lib/mobile-prototype/sync-voice";

export type LifeContextCandidate = {
  text: string;
  score: number;
  consequence: SyncConsequence | null;
  suppressTopics: string[];
};

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[.!?]/g, "").trim();
}

function mentionsTopic(text: string, topics: string[]) {
  const normalized = normalizeText(text);
  return topics.some((topic) => normalized.includes(topic));
}

function itemScheduleKey(item: CapturedSyncItem, reference: Date) {
  return (
    item.timeline?.deadlineDate ??
    item.timeline?.startDate ??
    resolveCaptureDateKey(item, reference)
  );
}

function isPaydayMemory(item: CapturedSyncItem) {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  return (
    item.parsedInput?.moneyType === "income" ||
    item.moneyType === "income" ||
    /\b(payday|pay day|get paid|paycheck)\b/.test(text)
  );
}

function isRentMemory(item: CapturedSyncItem) {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  return /\brent\b/.test(text) && /\b(due|pay)\b/.test(text);
}

function paydayBeforeRentFromItems(
  items: CapturedSyncItem[],
  consequences: SyncConsequence[],
  reference: Date,
): LifeContextCandidate | null {
  const paydayItem = findPaydayItem(items);
  const rentItem = findRentItem(items);
  if (!paydayItem || !rentItem) return null;

  const paydayKey = itemScheduleKey(paydayItem, reference);
  const rentKey = itemScheduleKey(rentItem, reference);
  const paydayDays = paydayKey ? daysUntilDateKey(paydayKey, reference) : null;
  const rentDays = rentKey ? daysUntilDateKey(rentKey, reference) : null;

  const landsBefore =
    (paydayKey && rentKey && paydayKey < rentKey) ||
    (paydayDays != null &&
      rentDays != null &&
      paydayDays >= 0 &&
      rentDays >= 0 &&
      paydayDays < rentDays);

  if (!landsBefore) return null;

  const paydayConsequence =
    consequences.find(
      (consequence) => consequence.sourceMemoryId === paydayItem.id,
    ) ?? findPayday(consequences);

  return {
    text: CONTEXT_PAYDAY_BEFORE_RENT,
    score: 540,
    consequence: paydayConsequence ?? null,
    suppressTopics: ["payday", "rent"],
  };
}

function findPaydayItem(items: CapturedSyncItem[]) {
  return items.find(
    (item) =>
      item.status !== "cancelled" &&
      !item.deletedAt &&
      isPaydayMemory(item),
  );
}

function findRentItem(items: CapturedSyncItem[]) {
  return items.find(
    (item) =>
      item.status !== "cancelled" &&
      !item.deletedAt &&
      isRentMemory(item),
  );
}

function findPayday(consequences: SyncConsequence[]) {
  return consequences.find(
    (consequence) =>
      (consequence.kind === "income" ||
        /\bpayday\b/i.test(consequence.surfaceText)) &&
      (consequence.daysUntil ?? 99) <= 7 &&
      (consequence.daysUntil ?? 99) >= 0,
  );
}

function findRent(consequences: SyncConsequence[]) {
  return consequences.find(
    (consequence) =>
      (consequence.kind === "financial_due" ||
        /\brent\b/i.test(consequence.surfaceText)) &&
      (consequence.daysUntil ?? 99) <= 7 &&
      (consequence.daysUntil ?? 99) >= 0,
  );
}

function findFlight(consequences: SyncConsequence[]) {
  return consequences.find(
    (consequence) =>
      consequence.briefEligible &&
      /\bflight\b/i.test(consequence.surfaceText) &&
      (consequence.daysUntil ?? 99) <= 7,
  );
}

function memoryText(item: CapturedSyncItem) {
  return `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
}

export function buildPaydayBeforeRentContext(
  consequences: SyncConsequence[],
  items: CapturedSyncItem[] = [],
  reference = new Date(),
): LifeContextCandidate | null {
  const fromItems = paydayBeforeRentFromItems(items, consequences, reference);
  if (fromItems) return fromItems;

  const payday = findPayday(consequences);
  const rent = findRent(consequences);
  if (!payday || !rent) return null;

  if (payday.dateKey && rent.dateKey) {
    if (payday.dateKey >= rent.dateKey) return null;
  } else {
    const paydayDays = payday.daysUntil ?? 99;
    const rentDays = rent.daysUntil ?? 99;
    if (paydayDays < 0 || rentDays < 0) return null;
    if (paydayDays >= rentDays) return null;
  }

  return {
    text: CONTEXT_PAYDAY_BEFORE_RENT,
    score: 540,
    consequence: payday,
    suppressTopics: ["payday", "rent"],
  };
}

export function buildPaydayBeforeFlightContext(
  consequences: SyncConsequence[],
): LifeContextCandidate | null {
  const payday = findPayday(consequences);
  const flight = findFlight(consequences);
  if (!payday || !flight) return null;

  const paydayDays = payday.daysUntil ?? 99;
  const flightDays = flight.daysUntil ?? 99;
  if (paydayDays < 0 || flightDays < 0) return null;
  if (paydayDays > flightDays) return null;
  if (paydayDays === flightDays && (payday.sortMinutes ?? 0) > (flight.sortMinutes ?? 0)) {
    return null;
  }

  return {
    text: CONTEXT_PAYDAY_BEFORE_FLIGHT,
    score: 535,
    consequence: payday,
    suppressTopics: ["payday", "flight"],
  };
}

export function buildEmotionalContext(
  items: CapturedSyncItem[],
  reference: Date,
): LifeContextCandidate | null {
  const active = items.filter(
    (item) => item.status !== "cancelled" && !item.deletedAt,
  );

  const emotional = active.filter((item) => {
    const profile = buildMemoryProfile(item, reference);
    return resolveMemoryThread(profile, memoryText(item)) === "emotional";
  });

  const recentStress = emotional.filter((item) =>
    /\b(sad|upset|anxious|stressed|depressed|lonely|overwhelmed)\b/i.test(
      memoryText(item),
    ),
  );

  const withinWeek = recentStress.filter((item) => {
    const created = new Date(item.createdAt);
    const days = Math.round(
      (reference.getTime() - created.getTime()) / (24 * 60 * 60 * 1000),
    );
    return days <= 14;
  });

  if (withinWeek.length >= 3) {
    return {
      text: CONTEXT_EMOTION_STRESS_PATTERN,
      score: 520,
      consequence: null,
      suppressTopics: ["sad", "stress", "emotional"],
    };
  }

  const todayEmotion = emotional.find((item) => {
    const profile = buildMemoryProfile(item, reference);
    return profile.timeRelevance === "today";
  });

  if (todayEmotion && withinWeek.length >= 1) {
    return {
      text: CONTEXT_EMOTION_NOTED_TODAY,
      score: 480,
      consequence: null,
      suppressTopics: ["sad", "stress", "emotional"],
    };
  }

  return null;
}

export function applyLifeContextConnections<T extends { text: string; score: number; consequence: SyncConsequence | null }>(
  candidates: T[],
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
): T[] {
  const connections = [
    buildPaydayBeforeRentContext(consequences, items, reference),
    buildPaydayBeforeFlightContext(consequences),
    buildEmotionalContext(items, reference),
  ].filter((entry): entry is LifeContextCandidate => entry != null);

  if (connections.length === 0) return candidates;

  const injected = connections.map((connection) => ({
    text: connection.text,
    score: connection.score,
    consequence: connection.consequence,
  })) as T[];

  return [...candidates, ...injected];
}

function linesOverlap(a: string, b: string) {
  const left = a.toLowerCase().replace(/[.!?]/g, "").trim();
  const right = b.toLowerCase().replace(/[.!?]/g, "").trim();
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const topics = [
    "payday",
    "rent",
    "flight",
    "tomorrow morning is packed",
    "money lands before rent",
    "payday lands before rent",
    "tomorrow starts early",
    "tight morning",
  ];
  return topics.some((topic) => left.includes(topic) && right.includes(topic));
}

export function buildLifeContextForecast(input: {
  blocks: SyncTimeBlock[];
  items: CapturedSyncItem[];
  consequences: SyncConsequence[];
  reference: Date;
  isQuiet: boolean;
  lastEndToday: number;
  nowMinutes: number;
  existingLines?: string[];
}): string | null {
  const {
    consequences,
    items,
    reference,
    isQuiet,
    lastEndToday,
    nowMinutes,
    existingLines = [],
  } = input;

  const overlaps = (text: string) =>
    existingLines.some((line) => linesOverlap(line, text));

  if (isQuiet) {
    return overlaps(FORECAST_SHARPEN) ? null : FORECAST_SHARPEN;
  }

  const paydayRent = buildPaydayBeforeRentContext(consequences, items, reference);
  if (paydayRent && !overlaps(FORECAST_MONEY_BEFORE_RENT) && !overlaps(paydayRent.text)) {
    return FORECAST_MONEY_BEFORE_RENT;
  }

  const tomorrowLoad = assessTomorrowLoad(consequences);

  if (lastEndToday > nowMinutes && lastEndToday <= 24 * 60) {
    const openLabel = formatSyncClock(
      `${String(Math.floor(lastEndToday / 60)).padStart(2, "0")}:${String(lastEndToday % 60).padStart(2, "0")}`,
    );
    if (openLabel) {
      const quietAfter = FORECAST_QUIET_AFTER(openLabel);
      if (!overlaps(quietAfter)) return quietAfter;
    }
  }

  if (nowMinutes >= lastEndToday && lastEndToday > 0) {
    if (tomorrowLoad.earlyStart && !overlaps(FORECAST_TOMORROW_MORNING_PACKED)) {
      return FORECAST_TOMORROW_MORNING_PACKED;
    }
    if (
      (tomorrowLoad.level === "busy" || tomorrowLoad.level === "heavy") &&
      !overlaps(FORECAST_TOMORROW_MORNING_PACKED)
    ) {
      return FORECAST_TOMORROW_MORNING_PACKED;
    }
  }

  if (tomorrowLoad.earlyStart && !overlaps(FORECAST_TOMORROW_EARLY)) {
    return FORECAST_TOMORROW_EARLY;
  }

  const peopleCount = consequences.filter(
    (consequence) =>
      consequence.briefEligible &&
      (consequence.daysUntil ?? 99) <= 7 &&
      (consequence.kind === "family_moment" ||
        consequence.kind === "relationship_moment" ||
        /\bbirthday\b/i.test(consequence.surfaceText)),
  ).length;

  const workCount = consequences.filter(
    (consequence) =>
      consequence.briefEligible &&
      (consequence.daysUntil ?? 99) <= 3 &&
      (consequence.kind === "work_start" || consequence.area === "work"),
  ).length;

  if (peopleCount >= 2 && peopleCount >= workCount && !overlaps(FORECAST_PEOPLE_THIS_WEEK)) {
    return FORECAST_PEOPLE_THIS_WEEK;
  }

  if (workCount >= 4 && !overlaps(FORECAST_WORK_ANCHORS)) {
    return FORECAST_WORK_ANCHORS;
  }

  if (tomorrowLoad.commitmentCount === 0 && !overlaps(FORECAST_NOTHING_NEEDS_ATTENTION)) {
    return FORECAST_NOTHING_NEEDS_ATTENTION;
  }

  if (
    (tomorrowLoad.level === "busy" || tomorrowLoad.level === "heavy") &&
    !overlaps(FORECAST_TOMORROW_MORNING_PACKED)
  ) {
    return FORECAST_TOMORROW_MORNING_PACKED;
  }

  if (!overlaps(FORECAST_SPACE_EVENING)) {
    return FORECAST_SPACE_EVENING;
  }

  return null;
}

export function homeEmptyHeadline() {
  return HOME_EMPTY_HEADLINE;
}

export function countRecentStressMentions(
  items: CapturedSyncItem[],
  reference: Date,
): number {
  const active = items.filter(
    (item) => item.status !== "cancelled" && !item.deletedAt,
  );
  return active.filter((item) => {
    const profile = buildMemoryProfile(item, reference);
    if (resolveMemoryThread(profile, memoryText(item)) !== "emotional") return false;
    return /\b(sad|upset|anxious|stressed|depressed|lonely|overwhelmed)\b/i.test(
      memoryText(item),
    );
  }).length;
}

export function hasEmotionalSiblings(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference: Date,
) {
  return itemsInSameThread(item, items, reference).length > 0;
}
