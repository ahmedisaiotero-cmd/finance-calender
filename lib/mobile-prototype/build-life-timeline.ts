import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  isAwkwardBriefLine,
  scoreConsequenceForTodaySurface,
} from "@/lib/intelligence/consequence-link";
import {
  isTimelineNoiseConsequence,
  resolveConsequenceSortMinutes,
  resolveConsequenceTimeLabel,
  withResolvedConsequenceTiming,
} from "@/lib/intelligence/consequence-timing";
import { memoryVisibility } from "@/lib/intelligence/memory-aging";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { cleanSurfacedCopy } from "@/lib/sync-capture/surface-copy";

export type LifeTimelineEntry = {
  id: string;
  time: string | null;
  text: string;
};

export type LifeTimelineGroup = {
  id: string;
  label: string;
  dayOffset: number | null;
  entries: LifeTimelineEntry[];
};

export type LifeTimelineView = {
  title: string;
  groups: LifeTimelineGroup[];
  previewLine: string | null;
  isEmpty: boolean;
};

function normalizeFact(text: string) {
  return text.toLowerCase().replace(/[.!?]/g, "").trim();
}

function factsOverlap(a: string, b: string) {
  const left = normalizeFact(a);
  const right = normalizeFact(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const topics = [
    "payday",
    "flight",
    "rent",
    "birthday",
    "anniversary",
    "workout",
    "work starts",
    "work begins",
  ];
  return topics.some((topic) => left.includes(topic) && right.includes(topic));
}

function cleanTimelineLabel(text: string) {
  return cleanSurfacedCopy(text.replace(/\s+at\s*$/i, "").trim());
}

function titleForConsequence(
  consequence: SyncConsequence,
  items: CapturedSyncItem[],
) {
  const source = consequence.sourceMemoryId
    ? items.find((item) => item.id === consequence.sourceMemoryId)
    : null;
  const prompt = (
    source?.originalPrompt ??
    source?.prompt ??
    consequence.surfaceText
  ).toLowerCase();

  if (consequence.kind === "income" || /\bpayday\b/.test(prompt)) {
    return "Payday";
  }
  if (/\bflight\b/.test(prompt)) return "Flight";
  if (/\brent\b/.test(prompt)) return "Rent is due";
  if (/\bworkout\b|\bgym\b/.test(prompt)) return "Workout";
  if (/\bproject\b/.test(prompt) && /\b(worked|working|coded)\b/.test(prompt)) {
    return "Project work";
  }
  if (consequence.kind === "work_start") return "Work starts";
  if (/\bbirthday\b/.test(prompt)) {
    if (/\bfriend/.test(prompt)) return "Friend's birthday";
    return "Birthday";
  }
  if (/\banniversary\b/.test(prompt)) return "Anniversary";
  if (/\bdaughter\b|\bson\b/.test(prompt) && /\bschool\b/.test(prompt)) {
    return "Daughter has school";
  }

  const title = source ? displayMemoryTitle(source) : cleanTimelineLabel(consequence.surfaceText);
  return cleanTimelineLabel(title);
}

export function timelineEntryFromConsequence(
  consequence: SyncConsequence,
  items: CapturedSyncItem[] = [],
): LifeTimelineEntry {
  const resolved = withResolvedConsequenceTiming(consequence, items);
  const time = resolveConsequenceTimeLabel(resolved, items);
  let text = titleForConsequence(resolved, items);

  if (!text) {
    text = cleanTimelineLabel(resolved.surfaceText);
  }

  if (/^work (?:starts|begins)/i.test(text) && time) {
    text = "Work starts";
  }

  return {
    id: resolved.id,
    time,
    text,
  };
}

function groupLabelForConsequence(
  consequence: SyncConsequence,
): { id: string; label: string; dayOffset: number | null } {
  const days = consequence.daysUntil;
  if (days === 0) {
    return { id: "group-today", label: "Today", dayOffset: 0 };
  }
  if (days === 1) {
    return { id: "group-tomorrow", label: "Tomorrow", dayOffset: 1 };
  }
  if (days != null && days >= 2 && days <= 7 && consequence.dateKey) {
    const [y, m, d] = consequence.dateKey.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long",
    });
    return { id: `group-${consequence.dateKey}`, label: weekday, dayOffset: days };
  }
  if (days != null && days >= 2 && days <= 14) {
    return { id: "group-this-week", label: "This Week", dayOffset: days };
  }
  if (days != null && days > 14) {
    return { id: "group-later", label: "Later", dayOffset: days };
  }
  return { id: "group-upcoming", label: "Upcoming", dayOffset: days };
}

function eligibleTimelineConsequences(
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
) {
  return consequences
    .filter((consequence) => {
      if (!consequence.briefEligible) return false;
      if (isTimelineNoiseConsequence(consequence)) return false;
      if (isAwkwardBriefLine(consequence.surfaceText)) return false;
      if (consequence.daysUntil == null || consequence.daysUntil < 0) {
        return false;
      }

      if (consequence.sourceMemoryId) {
        const source = items.find((item) => item.id === consequence.sourceMemoryId);
        if (source) {
          const visibility = memoryVisibility(source, items, reference);
          if (visibility === "hidden" || visibility === "fading") {
            return scoreConsequenceForTodaySurface(consequence, items, reference) >= 0;
          }
        }
      }

      return scoreConsequenceForTodaySurface(consequence, items, reference) >= 0;
    })
    .map((consequence) => withResolvedConsequenceTiming(consequence, items))
    .sort((a, b) => {
      const dayA = a.daysUntil ?? 99;
      const dayB = b.daysUntil ?? 99;
      if (dayA !== dayB) return dayA - dayB;
      const minuteA = resolveConsequenceSortMinutes(a, items) ?? 24 * 60;
      const minuteB = resolveConsequenceSortMinutes(b, items) ?? 24 * 60;
      if (minuteA !== minuteB) return minuteA - minuteB;
      return a.priority - b.priority;
    });
}

export function buildLifeTimelineView(input: {
  consequences: SyncConsequence[];
  items: CapturedSyncItem[];
  reference?: Date;
  focusDayOffset?: number | null;
  focusDateKey?: string | null;
}): LifeTimelineView {
  const reference = input.reference ?? new Date();
  const eligible = eligibleTimelineConsequences(
    input.consequences,
    input.items,
    reference,
  );

  const groupMap = new Map<string, LifeTimelineGroup>();

  for (const consequence of eligible) {
    const groupMeta = groupLabelForConsequence(consequence);
    if (
      input.focusDayOffset != null &&
      consequence.daysUntil !== input.focusDayOffset
    ) {
      continue;
    }
    if (
      input.focusDateKey &&
      consequence.dateKey &&
      consequence.dateKey !== input.focusDateKey
    ) {
      continue;
    }

    const entry = timelineEntryFromConsequence(consequence, input.items);
    if (!entry.text) continue;

    const group =
      groupMap.get(groupMeta.id) ??
      ({
        id: groupMeta.id,
        label: groupMeta.label,
        dayOffset: groupMeta.dayOffset,
        entries: [],
      } satisfies LifeTimelineGroup);

    if (group.entries.some((existing) => factsOverlap(existing.text, entry.text))) {
      continue;
    }

    group.entries.push(entry);
    groupMap.set(groupMeta.id, group);
  }

  const groups = [...groupMap.values()].sort((a, b) => {
    const dayA = a.dayOffset ?? 99;
    const dayB = b.dayOffset ?? 99;
    return dayA - dayB;
  });

  const firstEntry = groups[0]?.entries[0];
  const previewLine = firstEntry
    ? firstEntry.time
      ? `${firstEntry.time} — ${firstEntry.text}`
      : firstEntry.text
    : null;

  return {
    title: input.focusDayOffset === 1 ? "Tomorrow" : "Life Timeline",
    groups,
    previewLine,
    isEmpty: groups.length === 0,
  };
}
