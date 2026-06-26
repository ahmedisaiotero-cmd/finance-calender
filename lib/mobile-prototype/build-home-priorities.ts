import { toDateKey } from "@/lib/calendar-utils";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  briefFactsOverlap,
  buildTomorrowSummaryCandidate,
  decideTodayPriorities,
  isTomorrowSummaryText,
  type DecisionCandidate,
  type TodayDecision,
} from "@/lib/intelligence/decision-engine";
import {
  runSyncEngine,
  type SyncEngineOutput,
} from "@/lib/intelligence/sync-engine";
import {
  buildDrilldownForConsequence,
  buildDrilldownForInsight,
  type ConsequenceLink,
} from "@/lib/intelligence/consequence-link";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import {
  buildSyncTimeBlocksForRange,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import {
  buildLifeContextForecast,
  homeEmptyHeadline,
} from "@/lib/mobile-prototype/build-life-context";
import {
  HOME_NOTHING_NEEDS_ATTENTION,
} from "@/lib/mobile-prototype/sync-voice";
import { buildHomeReflection } from "@/lib/mobile-prototype/build-home-reflection";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type HomePriorityLine = ConsequenceLink;

export type HomePrioritiesView = {
  reflection: HomePriorityLine | null;
  primaryPriority: HomePriorityLine;
  supportingPriorities: HomePriorityLine[];
  futureContext: HomePriorityLine | null;
  syncEngine: SyncEngineOutput;
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

export { briefFactsOverlap, isTomorrowSummaryText };

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

  const tomorrowSummary = buildTomorrowSummaryCandidate(consequences);
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
  primary: DecisionCandidate,
  supporting: DecisionCandidate[],
  rankedCandidates: DecisionCandidate[],
  futureContext: HomePriorityLine | null,
  reflection: HomePriorityLine | null,
  items: CapturedSyncItem[],
  consequences: SyncConsequence[],
  reference: Date,
  isEmpty: boolean,
  isQuiet: boolean,
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
  const visiblePrimary = {
    ...primary,
    text: primaryPriority.text,
  };
  const visibleSupporting = supporting.map((candidate, index) => ({
    ...candidate,
    text: supportingPriorities[index]?.text ?? candidate.text,
  }));
  const visibleDecision: TodayDecision = {
    primary: visiblePrimary,
    supporting: visibleSupporting,
    rankedCandidates,
    isEmpty,
    isQuiet,
  };
  const syncEngine = runSyncEngine({ decision: visibleDecision, reference });

  return {
    reflection,
    primaryPriority,
    supportingPriorities,
    futureContext,
    syncEngine,
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
  priorities?: string[];
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
      { text: homeEmptyHeadline(), score: 0, consequence: null, source: "empty" },
      [],
      [],
      emptyForecast
        ? { text: emptyForecast, drilldown: null }
        : null,
      null,
      items,
      consequences,
      reference,
      true,
      false,
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

  const decision = decideTodayPriorities({
    consequences,
    items,
    blocks,
    reference,
    workSchedule: input.workSchedule,
    hasUserContext,
    priorities: input.priorities,
  });

  if (decision.isQuiet) {
    const reflection = resolveReflection(
      blocks,
      items,
      consequences,
      reference,
      input.workSchedule,
      [HOME_NOTHING_NEEDS_ATTENTION],
    );

    return toView(
      {
        text: HOME_NOTHING_NEEDS_ATTENTION,
        score: 0,
        consequence: null,
        source: "quiet",
      },
      [],
      [],
      null,
      reflection,
      items,
      consequences,
      reference,
      false,
      true,
    );
  }

  const { primary, supporting, rankedCandidates } = decision;

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
    rankedCandidates,
    futureContext,
    reflection,
    items,
    consequences,
    reference,
    false,
    false,
  );
}
