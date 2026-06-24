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

export type DecisionCandidate = {
  text: string;
  score: number;
  consequence: SyncConsequence | null;
  source: DecisionCandidateSource;
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
  isEmpty: boolean;
  isQuiet: boolean;
};

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

    score += profilePriorityBoost(block.area, text, priorities);

    candidates.push({
      text,
      score,
      source: "today_timed",
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

      score += profilePriorityBoost(consequence.area, text, priorities);

      return { text, score, consequence, source: "consequence" as const };
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
    source: "tomorrow_summary",
    consequence: synthesis ?? null,
  };
}

function selectPriorities(
  candidates: DecisionCandidate[],
  maxSupporting: number,
  consequences: SyncConsequence[],
): { primary: DecisionCandidate; supporting: DecisionCandidate[] } {
  const ranked = [...candidates]
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
      consequence: null,
      source: "quiet",
    };
  }

  return { primary, supporting };
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
        consequence: null,
        source: "empty",
      },
      supporting: [],
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

  const { primary, supporting } = selectPriorities(
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
    isEmpty: false,
    isQuiet,
  };
}
