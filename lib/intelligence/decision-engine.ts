import { toDateKey } from "@/lib/calendar-utils";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  assessTomorrowLoad,
  headlineForTomorrowLoad,
} from "@/lib/intelligence/life-load";
import {
  isAwkwardBriefLine,
  personalizePriorityDetailText,
  scoreConsequenceForTodaySurface,
} from "@/lib/intelligence/consequence-link";
import { isTimelineNoiseConsequence } from "@/lib/intelligence/consequence-timing";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import { applyLifeContextConnections } from "@/lib/mobile-prototype/build-life-context";
import { HOME_QUIET } from "@/lib/mobile-prototype/sync-voice";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { isContextConnectionLine } from "@/lib/sync-capture/surface-copy";
import {
  formatSyncClock,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type DecisionCandidateSource =
  | "today_timed"
  | "consequence"
  | "life_context"
  | "tomorrow_summary"
  | "empty"
  | "quiet";

export type DecisionScoreBreakdown = {
  base: number;
  todayBoost: number;
  tomorrowBoost: number;
  timeProximity: number;
  profilePriority: number;
  specificity: number;
  penalty: number;
};

export type DecisionCandidate = {
  text: string;
  score: number;
  consequence: SyncConsequence | null;
  source: DecisionCandidateSource;
  area?: string;
  daysUntil?: number | null;
  dateKey?: string | null;
  sortMinutes?: number | null;
  isSpecific?: boolean;
  isContext?: boolean;
  scoreBreakdown?: DecisionScoreBreakdown;
};

export type DecisionEngineInput = {
  consequences: SyncConsequence[];
  items: CapturedSyncItem[];
  blocks: SyncTimeBlock[];
  reference?: Date;
  workSchedule?: PersistedWorkSchedule | null;
  hasUserContext?: boolean;
  priorities?: string[];
  maxSupporting?: number;
};

export type TodayDecision = {
  primary: DecisionCandidate;
  supporting: DecisionCandidate[];
  rankedCandidates: DecisionCandidate[];
  isEmpty: boolean;
  isQuiet: boolean;
};

function totalScore(breakdown: DecisionScoreBreakdown) {
  return (
    breakdown.base +
    breakdown.todayBoost +
    breakdown.tomorrowBoost +
    breakdown.timeProximity +
    breakdown.profilePriority +
    breakdown.specificity +
    breakdown.penalty
  );
}

function scoreBreakdown(
  parts: Partial<DecisionScoreBreakdown> & Pick<DecisionScoreBreakdown, "base">,
): DecisionScoreBreakdown {
  return {
    base: parts.base,
    todayBoost: parts.todayBoost ?? 0,
    tomorrowBoost: parts.tomorrowBoost ?? 0,
    timeProximity: parts.timeProximity ?? 0,
    profilePriority: parts.profilePriority ?? 0,
    specificity: parts.specificity ?? 0,
    penalty: parts.penalty ?? 0,
  };
}

function candidateMetadata(
  text: string,
  consequence: SyncConsequence | null,
  source: DecisionCandidateSource,
): Pick<
  DecisionCandidate,
  | "area"
  | "daysUntil"
  | "dateKey"
  | "sortMinutes"
  | "isSpecific"
  | "isContext"
> {
  return {
    area: consequence?.area,
    daysUntil: consequence?.daysUntil,
    dateKey: consequence?.dateKey,
    sortMinutes: consequence?.sortMinutes,
    isSpecific:
      !isTomorrowSummaryText(text) &&
      !isContextConnectionLine(text) &&
      source !== "empty" &&
      source !== "quiet",
    isContext: isContextConnectionLine(text) || source === "life_context",
  };
}

function normalizeCandidate(candidate: DecisionCandidate): DecisionCandidate {
  const source =
    candidate.source ??
    (isContextConnectionLine(candidate.text) ? "life_context" : "consequence");
  const breakdown =
    candidate.scoreBreakdown ?? scoreBreakdown({ base: candidate.score });

  return {
    ...candidate,
    source,
    scoreBreakdown: breakdown,
    score: totalScore(breakdown),
    ...candidateMetadata(candidate.text, candidate.consequence, source),
  };
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

function profilePriorityBoost(
  area: string,
  text: string,
  priorities: string[],
): number {
  if (priorities.length === 0) return 0;

  const normalizedArea = area.toLowerCase();
  const normalizedText = text.toLowerCase();
  const matches = (priority: string, areas: string[], pattern: RegExp) =>
    priorities.includes(priority) &&
    (areas.includes(normalizedArea) || pattern.test(normalizedText));

  if (matches("Family", ["family", "school"], /\b(daughter|son|school|mom|dad|family)\b/)) {
    return 30;
  }
  if (matches("Relationships", ["relationships"], /\b(friend|partner|birthday|anniversary)\b/)) {
    return 30;
  }
  if (matches("Money", ["finance"], /\b(payday|rent|bill|due|finance)\b/)) {
    return 30;
  }
  if (matches("Work", ["work"], /\b(work|shift|project|flight)\b/)) {
    return 25;
  }
  if (matches("Health", ["health"], /\b(gym|workout|doctor|health)\b/)) {
    return 25;
  }
  if (matches("Goals", ["goals"], /\b(goal|milestone|progress)\b/)) {
    return 20;
  }
  if (matches("Home", ["home"], /\b(home|house|repair|maintenance)\b/)) {
    return 20;
  }

  return 0;
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
    "daughter",
    "school",
    "anniversary",
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

function candidatesFromTodayBlocks(
  blocks: SyncTimeBlock[],
  items: CapturedSyncItem[],
  reference: Date,
  priorities: string[],
): DecisionCandidate[] {
  const todayKey = toDateKey(reference);
  const now = currentMinutes(reference);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const candidates: DecisionCandidate[] = [];

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
    let breakdown: DecisionScoreBreakdown;

    if (start <= now && normalizedEnd > now) {
      text = endLabel
        ? `${title} wraps at ${endLabel}.`
        : `${title} is still in progress.`;
      breakdown = scoreBreakdown({
        base: 900,
        timeProximity: normalizedEnd - now,
      });
    } else {
      text = startLabel
        ? `${title} starts at ${startLabel}.`
        : `${title} is later today.`;
      breakdown = scoreBreakdown({
        base: 850,
        timeProximity: -(start - now),
      });
    }

    breakdown.profilePriority = profilePriorityBoost(block.area, text, priorities);

    const consequence: SyncConsequence = {
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
    };

    candidates.push({
      text,
      score: totalScore(breakdown),
      scoreBreakdown: breakdown,
      source: "today_timed",
      consequence,
      ...candidateMetadata(text, consequence, "today_timed"),
    });
  }

  return candidates;
}

function candidatesFromConsequences(
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
  excludeTodayTimed: boolean,
  priorities: string[],
): DecisionCandidate[] {
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
      const days = consequence.daysUntil ?? 99;
      const breakdown = scoreBreakdown({
        base: scoreConsequenceForTodaySurface(consequence, items, reference),
        todayBoost: days === 0 ? 40 : 0,
        tomorrowBoost: days === 1 ? 20 : 0,
      });


      if (consequence.sortMinutes != null) {
        breakdown.timeProximity =
          -Math.max(0, consequence.sortMinutes - currentMinutes(reference)) / 10;
      }

      if (consequence.kind === "work_start" && !consequence.sourceMemoryId) {
        breakdown.penalty -= 45;
      }

      if (consequence.kind === "income" || /\bflight\b/i.test(text)) {
        breakdown.specificity += 25;
      }

      breakdown.profilePriority = profilePriorityBoost(
        consequence.area,
        text,
        priorities,
      );

      return {
        text,
        score: totalScore(breakdown),
        scoreBreakdown: breakdown,
        consequence,
        source: "consequence" as const,
        ...candidateMetadata(text, consequence, "consequence"),
      };
    });
}

export function buildTomorrowSummaryCandidate(
  consequences: SyncConsequence[],
): DecisionCandidate | null {
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
    scoreBreakdown: scoreBreakdown({ base: 400 }),
    source: "tomorrow_summary",
    consequence: synthesis ?? null,
    ...candidateMetadata(headline, synthesis ?? null, "tomorrow_summary"),
  };
}

function selectPriorities(
  candidates: DecisionCandidate[],
  maxSupporting: number,
  consequences: SyncConsequence[],
): {
  primary: DecisionCandidate;
  supporting: DecisionCandidate[];
  rankedCandidates: DecisionCandidate[];
} {
  const ranked = candidates
    .map(normalizeCandidate)
    .filter((candidate) => !isAwkwardBriefLine(candidate.text))
    .sort((a, b) => b.score - a.score);

  const specific = ranked.filter(
    (candidate) =>
      !isTomorrowSummaryText(candidate.text) &&
      !isContextConnectionLine(candidate.text),
  );

  let primary = specific[0] ?? null;
  const supporting: DecisionCandidate[] = [];

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
      supporting.push({ ...candidate, source: "life_context" });
    }
  } else {
    const fallback = buildTomorrowSummaryCandidate(consequences);
    primary = fallback ?? {
      text: HOME_QUIET,
      score: 0,
      scoreBreakdown: scoreBreakdown({ base: 0 }),
      consequence: null,
      source: "quiet",
      ...candidateMetadata(HOME_QUIET, null, "quiet"),
    };
  }

  return { primary, supporting, rankedCandidates: ranked };
}

function briefProfileSortBoost(
  consequence: SyncConsequence,
  priorities: string[],
): number {
  if (priorities.length === 0) return 0;
  const text = consequence.surfaceText.toLowerCase();
  let boost = 0;

  if (
    priorities.includes("Family") &&
    /\b(daughter|son|school|mom|dad|family|birthday)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Relationships") &&
    /\b(friend|girlfriend|boyfriend|partner|anniversary|birthday)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Money") &&
    /\b(payday|rent|bill|due|finance)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Work") &&
    /\b(work|shift|flight|off tomorrow)\b/.test(text)
  ) {
    boost -= 4;
  }
  if (
    priorities.includes("Health") &&
    /\b(gym|workout|doctor|health)\b/.test(text)
  ) {
    boost -= 4;
  }

  return boost;
}

function compareBriefConsequenceRank(
  a: SyncConsequence,
  b: SyncConsequence,
  priorities: string[],
): number {
  const profileA = briefProfileSortBoost(a, priorities);
  const profileB = briefProfileSortBoost(b, priorities);
  const dayA = a.daysUntil ?? 99;
  const dayB = b.daysUntil ?? 99;
  if (dayA !== dayB) return dayA - dayB;
  if (a.dateKey && b.dateKey && a.dateKey !== b.dateKey) {
    return a.dateKey.localeCompare(b.dateKey);
  }
  const minuteA = a.sortMinutes ?? 24 * 60;
  const minuteB = b.sortMinutes ?? 24 * 60;
  if (minuteA !== minuteB) return minuteA - minuteB;
  const priorityA = a.priority + profileA;
  const priorityB = b.priority + profileB;
  return priorityA - priorityB;
}

/** Daily Brief consequence ordering — parity with legacy briefing-composer sort. */
export function rankBriefConsequences(input: {
  consequences: SyncConsequence[];
  priorities?: string[];
}): DecisionCandidate[] {
  const priorities = input.priorities ?? [];

  return [...input.consequences]
    .sort((a, b) => compareBriefConsequenceRank(a, b, priorities))
    .map((consequence) => {
      const profileBoost = briefProfileSortBoost(consequence, priorities);
      const breakdown = scoreBreakdown({
        base: consequence.priority,
        profilePriority: -profileBoost,
      });

      return {
        text: consequence.surfaceText,
        score: totalScore(breakdown),
        scoreBreakdown: breakdown,
        consequence,
        source: "consequence" as const,
        ...candidateMetadata(
          consequence.surfaceText,
          consequence,
          "consequence",
        ),
      };
    });
}

export function decideTodayPriorities(input: DecisionEngineInput): TodayDecision {
  const reference = input.reference ?? new Date();
  const hasUserContext = input.hasUserContext ?? input.items.length > 0;
  const maxSupporting = input.maxSupporting ?? 2;
  const priorities = input.priorities ?? [];

  if (!hasUserContext) {
    return {
      primary: {
        text: "",
        score: 0,
        scoreBreakdown: scoreBreakdown({ base: 0 }),
        consequence: null,
        source: "empty",
        ...candidateMetadata("", null, "empty"),
      },
      supporting: [],
      rankedCandidates: [],
      isEmpty: true,
      isQuiet: false,
    };
  }

  const { consequences, items, blocks } = input;

  const todayCandidates = candidatesFromTodayBlocks(
    blocks,
    items,
    reference,
    priorities,
  );
  const hasTodayPriority = todayCandidates.length > 0;
  const consequenceCandidates = candidatesFromConsequences(
    consequences,
    items,
    reference,
    hasTodayPriority,
    priorities,
  );

  const merged = applyLifeContextConnections(
    [...todayCandidates, ...consequenceCandidates],
    consequences,
    items,
    reference,
  );

  const { primary, supporting, rankedCandidates } = selectPriorities(
    merged,
    maxSupporting,
    consequences,
  );

  const isQuiet =
    primary.text === HOME_QUIET &&
    merged.length === 0 &&
    !buildTomorrowSummaryCandidate(consequences);

  return {
    primary,
    supporting,
    rankedCandidates,
    isEmpty: false,
    isQuiet,
  };
}
