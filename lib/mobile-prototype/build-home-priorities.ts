import { toDateKey } from "@/lib/calendar-utils";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  assessTomorrowLoad,
  headlineForTomorrowLoad,
} from "@/lib/intelligence/life-load";
import {
  buildDrilldownForConsequence,
  buildDrilldownForInsight,
  isAwkwardBriefLine,
  personalizePriorityDetailText,
  scoreConsequenceForTodaySurface,
  type ConsequenceLink,
} from "@/lib/intelligence/consequence-link";
import { isTimelineNoiseConsequence } from "@/lib/intelligence/consequence-timing";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import {
  buildSyncTimeBlocksForRange,
  formatSyncClock,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import {
  applyLifeContextConnections,
  buildLifeContextForecast,
  homeEmptyHeadline,
} from "@/lib/mobile-prototype/build-life-context";
import {
  HOME_NOTHING_NEEDS_ATTENTION,
  HOME_QUIET,
} from "@/lib/mobile-prototype/sync-voice";
import { isContextConnectionLine } from "@/lib/sync-capture/surface-copy";
import { buildHomeReflection } from "@/lib/mobile-prototype/build-home-reflection";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type HomePriorityLine = ConsequenceLink;

export type HomePrioritiesView = {
  reflection: HomePriorityLine | null;
  primaryPriority: HomePriorityLine;
  supportingPriorities: HomePriorityLine[];
  futureContext: HomePriorityLine | null;
  isEmpty: boolean;
  /** @deprecated use primaryPriority */
  headline: HomePriorityLine;
  /** @deprecated use supportingPriorities */
  details: HomePriorityLine[];
  /** @deprecated use futureContext */
  forecast: HomePriorityLine | null;
  /** @deprecated labels removed from UI */
  sectionLabel: null;
  /** @deprecated labels removed from UI */
  forecastLabel: null;
};

type PriorityCandidate = {
  text: string;
  score: number;
  consequence: SyncConsequence | null;
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function currentMinutes(reference: Date) {
  return reference.getHours() * 60 + reference.getMinutes();
}

function clockToMinutes(value?: string | null) {
  if (!value) return null;
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function isWorkScheduleBlock(block: SyncTimeBlock) {
  return block.blockType === "schedule" || block.title === "Work";
}

export function isTomorrowSummaryText(text: string): boolean {
  return /tomorrow (has a tight morning|starts early|looks busy|is mostly)/i.test(
    text,
  );
}

function normalizeBriefFact(text: string) {
  return text.toLowerCase().replace(/[.!?]/g, "").trim();
}

export function briefFactsOverlap(a: string, b: string) {
  const left = normalizeBriefFact(a);
  const right = normalizeBriefFact(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const sharedTopics = [
    "payday",
    "work starts",
    "work begins",
    "tomorrow starts early",
    "tight morning",
    "tomorrow morning is packed",
    "money lands before rent",
    "payday lands before rent",
    "flight",
    "birthday",
    "rent",
    "workout",
    "sync work",
  ];

  return sharedTopics.some(
    (topic) => left.includes(topic) && right.includes(topic),
  );
}

function friendlyBlockTitle(
  block: SyncTimeBlock,
  item: CapturedSyncItem | null,
): string {
  const prompt = (item?.originalPrompt ?? item?.prompt ?? block.title).toLowerCase();
  const title = item ? displayMemoryTitle(item) : block.title;

  if (/\bworkout\b/.test(prompt)) return "Workout";
  if (
    /\bsync\b/.test(prompt) &&
    (/\bwork\b|\bproject\b|\bfrom\b/.test(prompt) || title === "Sync")
  ) {
    return "Sync work";
  }
  if (/\bproject work\b/i.test(title)) return "Project work";

  return title;
}

function timedBlocksForDate(blocks: SyncTimeBlock[], dateKey: string) {
  return blocks.filter(
    (block) => block.date === dateKey && block.isTimed && block.startTime,
  );
}

function latestBlockEnd(blocks: SyncTimeBlock[]) {
  let latest = 0;
  for (const block of blocks) {
    const end = clockToMinutes(block.endTime);
    if (end != null && end > latest) latest = end;
  }
  return latest;
}

function linkFromText(
  text: string,
  consequence: SyncConsequence | null,
  items: CapturedSyncItem[],
  consequences: SyncConsequence[],
  reference: Date,
): HomePriorityLine {
  const drilldown = consequence
    ? buildDrilldownForConsequence(consequence, items, reference)
    : buildDrilldownForInsight(text, consequences, reference);

  return {
    text: text.endsWith(".") ? text : `${text}.`,
    drilldown,
  };
}

function candidatesFromTodayBlocks(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  reference: Date,
): PriorityCandidate[] {
  const todayKey = toDateKey(reference);
  const now = currentMinutes(reference);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const candidates: PriorityCandidate[] = [];

  for (const block of timedBlocksForDate(blocks, todayKey)) {
    if (isWorkScheduleBlock(block)) continue;

    const item = block.sourceItemId
      ? itemById.get(block.sourceItemId) ?? null
      : null;

    if (item && effectiveMemoryWeight(item, items, reference) === "light") {
      continue;
    }

    const start = clockToMinutes(block.startTime);
    const end =
      clockToMinutes(block.endTime) ??
      (start != null ? start + 60 : null);
    if (start == null || end == null) continue;

    const normalizedEnd = end <= start ? end + 24 * 60 : end;
    if (normalizedEnd <= now) continue;

    const title = friendlyBlockTitle(block, item);
    const endLabel = formatSyncClock(
      block.endTime ??
        `${String(Math.floor((normalizedEnd % (24 * 60)) / 60))}:${String(normalizedEnd % 60).padStart(2, "0")}`,
    );
    const startLabel = formatSyncClock(block.startTime);

    let text: string;
    let score: number;

    if (start <= now && normalizedEnd > now) {
      text = endLabel
        ? `${title} wraps at ${endLabel}.`
        : `${title} is still in progress.`;
      score = 900 + (normalizedEnd - now);
    } else {
      text = startLabel
        ? `${title} starts at ${startLabel}.`
        : `${title} is later today.`;
      score = 850 - (start - now);
    }

    candidates.push({
      text,
      score,
      consequence: {
        id: block.id,
        sourceMemoryId: block.sourceItemId,
        kind: "event",
        surfaceText: text,
        daysUntil: 0,
        dateKey: todayKey,
        priority: 5,
        horizon: "coming_soon",
        area: block.area,
        briefEligible: true,
        sortMinutes: start,
      },
    });
  }

  return candidates;
}

function candidatesFromConsequences(
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
  excludeTodayTimed: boolean,
): PriorityCandidate[] {
  const tomorrow = consequences.filter(
    (consequence) => consequence.daysUntil === 1 && consequence.briefEligible,
  );

  return consequences
    .filter((consequence) => {
      if (!consequence.briefEligible) return false;
      if (consequence.horizon === "background") return false;
      if (consequence.kind === "day_synthesis" || consequence.kind === "ambient") {
        return false;
      }
      if (isTimelineNoiseConsequence(consequence)) return false;
      if (isAwkwardBriefLine(consequence.surfaceText)) return false;
      if (isTomorrowSummaryText(consequence.surfaceText)) return false;
      if (scoreConsequenceForTodaySurface(consequence, items, reference) < 0) {
        return false;
      }
      if (
        excludeTodayTimed &&
        consequence.daysUntil === 0 &&
        consequence.sortMinutes != null
      ) {
        return false;
      }
      if (consequence.daysUntil === 0 && consequence.sortMinutes != null) {
        const now = currentMinutes(reference);
        if (consequence.sortMinutes + 60 <= now) return false;
      }
      return true;
    })
    .map((consequence) => {
      const text = personalizePriorityDetailText(consequence, [], tomorrow);
      let score = scoreConsequenceForTodaySurface(consequence, items, reference);

      const days = consequence.daysUntil ?? 99;
      if (days === 0) score += 40;
      else if (days === 1) score += 20;

      if (consequence.sortMinutes != null) {
        score -= Math.max(0, consequence.sortMinutes - currentMinutes(reference)) / 10;
      }

      if (consequence.kind === "work_start" && !consequence.sourceMemoryId) {
        score -= 45;
      }

      if (consequence.kind === "income" || /\bflight\b/i.test(text)) {
        score += 25;
      }

      return { text, score, consequence };
    });
}

function tomorrowSummaryCandidate(
  consequences: SyncConsequence[],
): PriorityCandidate | null {
  const assessment = assessTomorrowLoad(consequences);
  const headline = headlineForTomorrowLoad(assessment, consequences);
  if (!headline) return null;

  const synthesis = consequences.find(
    (consequence) =>
      consequence.kind === "day_synthesis" && consequence.daysUntil === 1,
  );

  return {
    text: headline,
    score: 400,
    consequence: synthesis ?? null,
  };
}

function selectPriorities(
  candidates: PriorityCandidate[],
  maxSupporting: number,
  consequences: SyncConsequence[],
): { primary: PriorityCandidate; supporting: PriorityCandidate[] } {
  const ranked = [...candidates]
    .filter((candidate) => !isAwkwardBriefLine(candidate.text))
    .sort((a, b) => b.score - a.score);

  const specific = ranked.filter(
    (candidate) =>
      !isTomorrowSummaryText(candidate.text) &&
      !isContextConnectionLine(candidate.text),
  );

  let primary = specific[0] ?? null;
  const supporting: PriorityCandidate[] = [];

  if (primary) {
    for (const candidate of specific.slice(1)) {
      if (supporting.length >= maxSupporting) break;
      if (briefFactsOverlap(candidate.text, primary.text)) continue;
      if (supporting.some((line) => briefFactsOverlap(line.text, candidate.text))) {
        continue;
      }
      supporting.push(candidate);
    }

    const contextLines = ranked.filter((candidate) =>
      isContextConnectionLine(candidate.text),
    );
    for (const candidate of contextLines) {
      if (supporting.length >= maxSupporting) break;
      if (briefFactsOverlap(candidate.text, primary.text)) continue;
      if (supporting.some((line) => briefFactsOverlap(line.text, candidate.text))) {
        continue;
      }
      supporting.push(candidate);
    }
  } else {
    const fallback = tomorrowSummaryCandidate(consequences);
    primary = fallback ?? { text: HOME_QUIET, score: 0, consequence: null };
  }

  return { primary, supporting };
}

function resolveFutureContext(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  consequences: SyncConsequence[],
  reference: Date,
  isQuiet: boolean,
  priorityTexts: string[],
): HomePriorityLine | null {
  if (isQuiet) return null;

  const todayKey = toDateKey(reference);
  const now = currentMinutes(reference);
  const todayBlocks = timedBlocksForDate(blocks, todayKey).filter(
    (block) => !isWorkScheduleBlock(block),
  );
  const lastEnd = latestBlockEnd(todayBlocks);

  const options: string[] = [];

  const contextual = buildLifeContextForecast({
    blocks,
    items,
    consequences,
    reference,
    isQuiet: false,
    lastEndToday: lastEnd,
    nowMinutes: now,
    existingLines: priorityTexts,
  });
  if (contextual) options.push(contextual);

  const tomorrowSummary = tomorrowSummaryCandidate(consequences);
  if (tomorrowSummary) {
    options.push(tomorrowSummary.text);
  }

  for (const text of options) {
    if (priorityTexts.some((line) => briefFactsOverlap(line, text))) continue;
    if (isTomorrowSummaryText(text) && primaryIsTomorrowSummary(priorityTexts)) {
      continue;
    }

    const payday = consequences.find(
      (consequence) =>
        (consequence.kind === "income" ||
          /\bpayday\b/i.test(consequence.surfaceText)) &&
        (consequence.daysUntil ?? 99) <= 7,
    );

    return linkFromText(text, payday ?? null, items, consequences, reference);
  }

  return null;
}

function primaryIsTomorrowSummary(priorityTexts: string[]) {
  return priorityTexts.some((line) => isTomorrowSummaryText(line));
}

function resolveReflection(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  consequences: SyncConsequence[],
  reference: Date,
  workSchedule: PersistedWorkSchedule | null | undefined,
  briefLines: string[],
): HomePriorityLine | null {
  const result = buildHomeReflection({
    items,
    consequences,
    blocks,
    reference,
    workSchedule,
    briefLines,
  });

  if (!result.text) return null;

  return {
    text: result.text,
    drilldown: result.drilldown,
  };
}

function toView(
  primary: PriorityCandidate,
  supporting: PriorityCandidate[],
  futureContext: HomePriorityLine | null,
  reflection: HomePriorityLine | null,
  items: CapturedSyncItem[],
  consequences: SyncConsequence[],
  reference: Date,
  isEmpty: boolean,
): HomePrioritiesView {
  const primaryPriority = linkFromText(
    primary.text,
    primary.consequence,
    items,
    consequences,
    reference,
  );
  const supportingPriorities = supporting.map((candidate) =>
    linkFromText(
      candidate.text,
      candidate.consequence,
      items,
      consequences,
      reference,
    ),
  );

  return {
    reflection,
    primaryPriority,
    supportingPriorities,
    futureContext,
    isEmpty,
    headline: primaryPriority,
    details: supportingPriorities,
    forecast: futureContext,
    sectionLabel: null,
    forecastLabel: null,
  };
}

export function buildHomePriorities(input: {
  consequences: SyncConsequence[];
  items: CapturedSyncItem[];
  reference?: Date;
  workSchedule?: PersistedWorkSchedule | null;
  hasUserContext?: boolean;
}): HomePrioritiesView {
  const reference = input.reference ?? new Date();
  const { consequences, items } = input;
  const hasUserContext = input.hasUserContext ?? items.length > 0;

  if (!hasUserContext) {
    const emptyForecast = buildLifeContextForecast({
      blocks: [],
      items: [],
      consequences: [],
      reference,
      isQuiet: true,
      lastEndToday: 0,
      nowMinutes: currentMinutes(reference),
      existingLines: [],
    });

    return toView(
      { text: homeEmptyHeadline(), score: 0, consequence: null },
      [],
      emptyForecast
        ? { text: emptyForecast, drilldown: null }
        : null,
      null,
      items,
      consequences,
      reference,
      true,
    );
  }

  const end = addDays(reference, 14);
  const blocks = buildSyncTimeBlocksForRange({
    items,
    startDate: reference,
    endDate: end,
    reference,
    workSchedule: input.workSchedule ?? null,
  });

  const todayCandidates = candidatesFromTodayBlocks(blocks, items, reference);
  const hasTodayPriority = todayCandidates.length > 0;
  const consequenceCandidates = candidatesFromConsequences(
    consequences,
    items,
    reference,
    hasTodayPriority,
  );

  const merged = applyLifeContextConnections(
    [...todayCandidates, ...consequenceCandidates],
    consequences,
    items,
    reference,
  );

  const { primary, supporting } = selectPriorities(merged, 4, consequences);

  const isQuiet =
    primary.text === HOME_QUIET &&
    merged.length === 0 &&
    !tomorrowSummaryCandidate(consequences);

  if (isQuiet) {
    const reflection = resolveReflection(
      blocks,
      items,
      consequences,
      reference,
      input.workSchedule,
      [HOME_NOTHING_NEEDS_ATTENTION],
    );

    return toView(
      { text: HOME_NOTHING_NEEDS_ATTENTION, score: 0, consequence: null },
      [],
      null,
      reflection,
      items,
      consequences,
      reference,
      false,
    );
  }

  const priorityTexts = [
    primary.text,
    ...supporting.map((candidate) => candidate.text),
  ];

  const futureContext = resolveFutureContext(
    blocks,
    items,
    consequences,
    reference,
    false,
    priorityTexts,
  );

  const briefLines = [
    ...priorityTexts,
    futureContext?.text ?? "",
  ].filter(Boolean);

  const reflection = resolveReflection(
    blocks,
    items,
    consequences,
    reference,
    input.workSchedule,
    briefLines,
  );

  return toView(
    primary,
    supporting,
    futureContext,
    reflection,
    items,
    consequences,
    reference,
    false,
  );
}
