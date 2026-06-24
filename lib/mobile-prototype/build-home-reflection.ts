import { toDateKey } from "@/lib/calendar-utils";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildDrilldownForConsequence,
  buildDrilldownForInsight,
  type LifeDrilldownTarget,
} from "@/lib/intelligence/consequence-link";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { memoryFilterCategory } from "@/lib/mobile-prototype/memory-category";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import {
  cleanSurfacedCopy,
  isMoneyLanguage,
} from "@/lib/sync-capture/surface-copy";
import {
  REFLECTION_EMOTIONAL_TODAY,
  REFLECTION_FAMILY_TODAY,
  REFLECTION_FULL_TODAY,
  REFLECTION_HEALTH_TODAY,
  REFLECTION_MONEY_TODAY,
  REFLECTION_ONGOING_WORK,
  REFLECTION_QUIET_TODAY,
  REFLECTION_SPENT_SYNC_WORK,
  REFLECTION_SPENT_WORKING,
} from "@/lib/mobile-prototype/sync-voice";
import { buildLifeObservation } from "@/lib/mobile-prototype/build-life-observation";
import {
  buildSyncTimeBlocksForRange,
  type SyncTimeBlock,
} from "@/lib/sync-time-blocks";
import type { MemoryWeight } from "@/lib/intelligence/memory-weight";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type HomeReflection = {
  text: string | null;
  drilldown: LifeDrilldownTarget | null;
  weight?: MemoryWeight;
  sourceIds?: string[];
};

type ReflectionCandidate = {
  text: string;
  weight: MemoryWeight;
  sourceIds: string[];
  consequence: SyncConsequence | null;
  priority: number;
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

function blockPrompt(block: SyncTimeBlock, item: CapturedSyncItem | null) {
  return (item?.originalPrompt ?? item?.prompt ?? block.title).toLowerCase();
}

function friendlyBlockLabel(
  block: SyncTimeBlock,
  item: CapturedSyncItem | null,
): string {
  const prompt = blockPrompt(block, item);
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

function isSyncWorkBlock(block: SyncTimeBlock, item: CapturedSyncItem | null) {
  const label = friendlyBlockLabel(block, item);
  return /sync work|project work/i.test(label);
}

function isHealthBlock(block: SyncTimeBlock, item: CapturedSyncItem | null) {
  const prompt = blockPrompt(block, item);
  return /\b(workout|gym|exercise)\b/.test(prompt) || item?.category === "workout";
}

function isFamilyBlock(block: SyncTimeBlock, item: CapturedSyncItem | null) {
  const prompt = blockPrompt(block, item);
  return (
    block.area === "family" ||
    block.area === "school" ||
    /\b(daughter|son|family|school)\b/.test(prompt) ||
    item?.destinations.includes("Family") === true
  );
}

function normalizeFact(text: string) {
  return text.toLowerCase().replace(/[.!?]/g, "").trim();
}

function isFutureReflectionText(text: string) {
  const normalized = normalizeFact(text);
  return (
    /\btomorrow\b/.test(normalized) ||
    /\bnext week\b/.test(normalized) ||
    /\bstarts early\b/.test(normalized) ||
    /\btight morning\b/.test(normalized)
  );
}

function duplicatesBriefLine(
  reflection: string,
  briefLines: string[],
  allowOngoingWithPrimary: boolean,
) {
  if (isFutureReflectionText(reflection)) return true;

  const reflectionNorm = normalizeFact(reflection);
  for (const line of briefLines) {
    const lineNorm = normalizeFact(line);
    if (reflectionNorm === lineNorm) return true;
    if (allowOngoingWithPrimary && reflection === REFLECTION_ONGOING_WORK) {
      continue;
    }
    if (reflectionNorm.includes(lineNorm) || lineNorm.includes(reflectionNorm)) {
      return true;
    }
  }
  return false;
}

function activeTodayItems(
  items: CapturedSyncItem[],
  reference: Date,
) {
  return items.filter((item) => {
    if (item.deletedAt || item.status === "cancelled") return false;
    const profile = buildMemoryProfile(item, reference);
    return profile.timeRelevance === "today" || profile.timeRelevance === "past";
  });
}

function meaningfulTodayItems(
  items: CapturedSyncItem[],
  reference: Date,
) {
  return activeTodayItems(items, reference).filter(
    (item) => effectiveMemoryWeight(item, items, reference) !== "light",
  );
}

function itemIsToday(item: CapturedSyncItem, reference: Date) {
  const profile = buildMemoryProfile(item, reference);
  if (profile.timeRelevance === "today" || profile.timeRelevance === "past") {
    return true;
  }
  const dateKey = resolveCaptureDateKey(item, reference);
  return dateKey === toDateKey(reference);
}

function consequenceForItem(
  itemId: string,
  consequences: SyncConsequence[],
) {
  return consequences.find((consequence) => consequence.sourceMemoryId === itemId) ?? null;
}

function finalizeReflection(
  candidate: ReflectionCandidate | null,
  input: {
    items: CapturedSyncItem[];
    consequences: SyncConsequence[];
    reference: Date;
    briefLines: string[];
  },
): HomeReflection {
  if (!candidate) return { text: null, drilldown: null };

  const allowOngoing = candidate.text === REFLECTION_ONGOING_WORK;
  if (
    duplicatesBriefLine(candidate.text, input.briefLines, allowOngoing)
  ) {
    return { text: null, drilldown: null };
  }

  const consequence =
    candidate.consequence ??
    (candidate.sourceIds[0]
      ? consequenceForItem(candidate.sourceIds[0], input.consequences)
      : null);

  const drilldown = consequence
    ? buildDrilldownForConsequence(consequence, input.items, input.reference)
    : buildDrilldownForInsight(candidate.text, input.consequences, input.reference);

  return {
    text: cleanSurfacedCopy(candidate.text),
    drilldown,
    weight: candidate.weight,
    sourceIds: candidate.sourceIds,
  };
}

function blockTiming(block: SyncTimeBlock, now: number) {
  const start = clockToMinutes(block.startTime);
  const end =
    clockToMinutes(block.endTime) ?? (start != null ? start + 60 : null);
  if (start == null || end == null) return null;

  const normalizedEnd = end <= start ? end + 24 * 60 : end;
  return { start, end: normalizedEnd, ongoing: start <= now && normalizedEnd > now, completed: normalizedEnd <= now };
}

export function buildHomeReflection(input: {
  items: CapturedSyncItem[];
  consequences: SyncConsequence[];
  blocks?: SyncTimeBlock[];
  reference?: Date;
  workSchedule?: PersistedWorkSchedule | null;
  briefLines?: string[];
}): HomeReflection {
  const reference = input.reference ?? new Date();
  const { items, consequences } = input;
  const briefLines = input.briefLines ?? [];
  const todayKey = toDateKey(reference);
  const now = currentMinutes(reference);

  const blocks =
    input.blocks ??
    buildSyncTimeBlocksForRange({
      items,
      startDate: reference,
      endDate: reference,
      reference,
      workSchedule: input.workSchedule ?? null,
    });

  const itemById = new Map(items.map((item) => [item.id, item]));
  const todayTimed = blocks.filter(
    (block) =>
      block.date === todayKey &&
      block.isTimed &&
      block.startTime &&
      !isWorkScheduleBlock(block),
  );

  const candidates: ReflectionCandidate[] = [];

  for (const block of todayTimed) {
    const item = block.sourceItemId
      ? itemById.get(block.sourceItemId) ?? null
      : null;
    if (item && effectiveMemoryWeight(item, items, reference) === "light") {
      continue;
    }

    const timing = blockTiming(block, now);
    if (!timing?.ongoing) continue;

    if (isSyncWorkBlock(block, item) || /\b(worked|working|project)\b/.test(blockPrompt(block, item))) {
      candidates.push({
        text: REFLECTION_ONGOING_WORK,
        weight: "important",
        sourceIds: item ? [item.id] : [],
        consequence: item ? consequenceForItem(item.id, consequences) : null,
        priority: 100,
      });
      break;
    }
  }

  for (const block of todayTimed) {
    const item = block.sourceItemId
      ? itemById.get(block.sourceItemId) ?? null
      : null;
    if (item && effectiveMemoryWeight(item, items, reference) === "light") {
      continue;
    }

    const timing = blockTiming(block, now);
    if (!timing?.completed) continue;

    if (isSyncWorkBlock(block, item)) {
      candidates.push({
        text: REFLECTION_SPENT_SYNC_WORK,
        weight: "meaningful",
        sourceIds: item ? [item.id] : [],
        consequence: item ? consequenceForItem(item.id, consequences) : null,
        priority: 90,
      });
      continue;
    }

    if (isHealthBlock(block, item)) {
      candidates.push({
        text: REFLECTION_HEALTH_TODAY,
        weight: "important",
        sourceIds: item ? [item.id] : [],
        consequence: item ? consequenceForItem(item.id, consequences) : null,
        priority: 88,
      });
      continue;
    }

    if (isFamilyBlock(block, item)) {
      candidates.push({
        text: REFLECTION_FAMILY_TODAY,
        weight: "important",
        sourceIds: item ? [item.id] : [],
        consequence: item ? consequenceForItem(item.id, consequences) : null,
        priority: 86,
      });
      continue;
    }

    if (/\b(worked|working|project|coded)\b/.test(blockPrompt(block, item))) {
      candidates.push({
        text: REFLECTION_SPENT_WORKING,
        weight: "important",
        sourceIds: item ? [item.id] : [],
        consequence: item ? consequenceForItem(item.id, consequences) : null,
        priority: 84,
      });
    }
  }

  const emotionalToday = items.filter((item) => {
    if (!itemIsToday(item, reference)) return false;
    const profile = buildMemoryProfile(item, reference);
    if (profile.type !== "emotion") return false;
    return effectiveMemoryWeight(item, items, reference) !== "light";
  });

  if (emotionalToday.length > 0) {
    candidates.push({
      text: REFLECTION_EMOTIONAL_TODAY,
      weight: "meaningful",
      sourceIds: emotionalToday.map((item) => item.id),
      consequence: consequenceForItem(emotionalToday[0].id, consequences),
      priority: 70,
    });
  }

  const observation = buildLifeObservation({
    items,
    consequences,
    reference,
  });

  if (observation.text) {
    candidates.push({
      text: observation.text,
      weight: "meaningful",
      sourceIds: observation.sourceIds,
      consequence: null,
      priority: 55,
    });
  }

  const meaningfulToday = meaningfulTodayItems(items, reference);
  const meaningfulBlockCount = todayTimed.filter((block) => {
    const item = block.sourceItemId
      ? itemById.get(block.sourceItemId) ?? null
      : null;
    return !item || effectiveMemoryWeight(item, items, reference) !== "light";
  }).length;

  if (meaningfulToday.length + meaningfulBlockCount >= 3) {
    candidates.push({
      text: REFLECTION_FULL_TODAY,
      weight: "important",
      sourceIds: meaningfulToday.slice(0, 3).map((item) => item.id),
      consequence: null,
      priority: 50,
    });
  }

  const moneyToday = meaningfulToday.filter((item) => {
    if (memoryFilterCategory(item) !== "Money") return false;
    const text = `${item.title} ${item.originalPrompt ?? item.prompt}`;
    return isMoneyLanguage(text);
  });

  if (moneyToday.length > 0) {
    candidates.push({
      text: REFLECTION_MONEY_TODAY,
      weight: "important",
      sourceIds: moneyToday.map((item) => item.id),
      consequence: consequenceForItem(moneyToday[0].id, consequences),
      priority: 40,
    });
  }

  if (meaningfulToday.length === 0 && meaningfulBlockCount === 0) {
    candidates.push({
      text: REFLECTION_QUIET_TODAY,
      weight: "light",
      sourceIds: [],
      consequence: null,
      priority: 10,
    });
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const best = candidates[0] ?? null;

  if (best?.text === REFLECTION_QUIET_TODAY && items.length === 0) {
    return { text: null, drilldown: null };
  }

  return finalizeReflection(best, { items, consequences, reference, briefLines });
}
