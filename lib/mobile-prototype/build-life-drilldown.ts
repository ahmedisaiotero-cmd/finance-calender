import type { CapturedSyncItem } from "@/lib/captured-items";
import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import { scoreConsequenceForTodaySurface } from "@/lib/intelligence/consequence-link";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import {
  isTimelineNoiseConsequence,
  resolveConsequenceSortMinutes,
} from "@/lib/intelligence/consequence-timing";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { itemsInSameThread, resolveMemoryThread } from "@/lib/intelligence/memory-thread";
import { resolveMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import {
  timelineEntryFromConsequence,
  type LifeTimelineEntry,
} from "@/lib/mobile-prototype/build-life-timeline";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";

export type DrilldownTimelineEntry = LifeTimelineEntry;

export type LifeDrilldownView = {
  target: LifeDrilldownTarget;
  title: string;
  lede: string;
  timeline: DrilldownTimelineEntry[];
  contextLines: string[];
  backLabel: string;
};

function memoryText(item: CapturedSyncItem) {
  const prompt = (item.originalPrompt ?? item.prompt).trim();
  return `${item.title} ${normalizeCaptureInput(prompt).normalized}`.toLowerCase();
}

function collectAreaEntries(
  area: string,
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
  max = 4,
): DrilldownTimelineEntry[] {
  return consequences
    .filter((consequence) => {
      if (isTimelineNoiseConsequence(consequence)) return false;
      if (consequence.area.toLowerCase() !== area.toLowerCase()) return false;
      if (scoreConsequenceForTodaySurface(consequence, items, reference) < 0) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dayA = a.daysUntil ?? 99;
      const dayB = b.daysUntil ?? 99;
      if (dayA !== dayB) return dayA - dayB;
      const minuteA = resolveConsequenceSortMinutes(a, items) ?? 24 * 60;
      const minuteB = resolveConsequenceSortMinutes(b, items) ?? 24 * 60;
      return minuteA - minuteB;
    })
    .slice(0, max)
    .map((consequence) => timelineEntryFromConsequence(consequence, items));
}

function formatAreaEntryText(entry: DrilldownTimelineEntry) {
  if (entry.time) {
    return `${entry.text} at ${entry.time}.`;
  }
  return entry.text.endsWith(".") ? entry.text : `${entry.text}.`;
}

function buildDayDrilldown(
  target: LifeDrilldownTarget,
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
  backLabel: string,
): LifeDrilldownView {
  const dayOffset = target.dayOffset ?? 1;
  const title = target.label;
  const dayConsequences = consequences
    .filter(
      (consequence) =>
        consequence.briefEligible &&
        consequence.daysUntil === dayOffset &&
        consequence.kind !== "day_synthesis" &&
        consequence.kind !== "ambient",
    )
    .sort((a, b) => {
      const minuteA = a.sortMinutes ?? 24 * 60;
      const minuteB = b.sortMinutes ?? 24 * 60;
      if (minuteA !== minuteB) return minuteA - minuteB;
      return a.priority - b.priority;
    });

  const lede =
    dayOffset === 1
      ? dayConsequences.some((c) => (c.sortMinutes ?? 999) < 7 * 60)
        ? "Your day starts early."
        : dayConsequences.length >= 3
          ? "Tomorrow looks full."
          : "Here's what shapes tomorrow."
      : "Here's what shapes today.";

  return {
    target,
    title,
    lede,
    timeline: dayConsequences
      .slice(0, 6)
      .map((consequence) => timelineEntryFromConsequence(consequence, items)),
    contextLines: [],
    backLabel,
  };
}

function buildMoneyDrilldown(
  target: LifeDrilldownTarget,
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
  backLabel: string,
): LifeDrilldownView {
  const financeEntries = collectAreaEntries("finance", consequences, items, reference, 4);
  const timeline = financeEntries.map((entry) => {
    if (entry.text === "Payday" && entry.time) {
      const earliest =
        consequences
          .filter(
            (consequence) =>
              consequence.daysUntil != null &&
              resolveConsequenceSortMinutes(consequence, items) != null,
          )
          .sort(
            (a, b) =>
              (resolveConsequenceSortMinutes(a, items) ?? 9999) -
              (resolveConsequenceSortMinutes(b, items) ?? 9999),
          )[0]?.id === entry.id;
      return {
        ...entry,
        text: earliest
          ? `Payday arrives first at ${entry.time}.`
          : `Payday at ${entry.time}.`,
      };
    }
    return {
      ...entry,
      text: formatAreaEntryText(entry),
    };
  });

  const contextLines: string[] = [];
  const spending = items.filter((item) => {
    if (effectiveMemoryWeight(item, items, reference) !== "light") return false;
    const profile = buildMemoryProfile(item, reference);
    return profile.type === "expense" || profile.type === "habit";
  });
  if (spending.length > 0) {
    contextLines.push("Recent small spending is being kept quietly.");
  }

  return {
    target,
    title: "Money",
    lede: "What matters financially.",
    timeline,
    contextLines,
    backLabel,
  };
}

function buildHealthDrilldown(
  target: LifeDrilldownTarget,
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
  backLabel: string,
): LifeDrilldownView {
  const scheduled = collectAreaEntries("health", consequences, items, reference, 3).map(
    (entry) => ({
      ...entry,
      text: formatAreaEntryText(entry),
    }),
  );

  const emotionalItems = items.filter((item) => {
    const profile = buildMemoryProfile(item, reference);
    return resolveMemoryThread(profile, memoryText(item)) === "emotional";
  });

  const emotional = emotionalItems.slice(0, 2).map((item) => ({
    id: item.id,
    time: null,
    text:
      profileLineForEmotional(item, reference) ??
      resolveMemoryUnderstanding(item, reference),
  }));

  const timeline = [...scheduled, ...emotional].slice(0, 4);
  const contextLines =
    emotionalItems.length >= 3
      ? ["Repeated stress mentions are forming a pattern worth noticing."]
      : [];

  return {
    target,
    title: "Health",
    lede: "What Sync has noticed.",
    timeline,
    contextLines,
    backLabel,
  };
}

function profileLineForEmotional(item: CapturedSyncItem, reference: Date) {
  const profile = buildMemoryProfile(item, reference);
  if (profile.type === "emotion" && profile.timeRelevance === "today") {
    return "Emotional check-in noted today.";
  }
  return null;
}

function buildMemoryDrilldown(
  target: LifeDrilldownTarget,
  items: CapturedSyncItem[],
  reference: Date,
  backLabel: string,
): LifeDrilldownView {
  const item = items.find((entry) => entry.id === target.sourceMemoryIds?.[0]);
  const title = item ? displayMemoryTitle(item) : target.label;
  const lede = item ? resolveMemoryUnderstanding(item, reference) : target.label;

  return {
    target,
    title,
    lede,
    timeline: [],
    contextLines: [],
    backLabel,
  };
}

function buildRoutineDrilldown(
  target: LifeDrilldownTarget,
  items: CapturedSyncItem[],
  consequences: SyncConsequence[],
  reference: Date,
  backLabel: string,
): LifeDrilldownView {
  const routineItems = items.filter((item) => {
    const profile = buildMemoryProfile(item, reference);
    return profile.accumulation === "routine" || item.category === "workday";
  });

  return {
    target,
    title: "Routines",
    lede: "Recurring rhythms Sync is tracking.",
    timeline: routineItems.slice(0, 4).map((item) => ({
      id: item.id,
      time: null,
      text: resolveMemoryUnderstanding(item, reference),
    })),
    contextLines: [],
    backLabel,
  };
}

export function buildLifeDrilldownView(
  target: LifeDrilldownTarget,
  options: {
    items: CapturedSyncItem[];
    consequences: SyncConsequence[];
    reference?: Date;
    backLabel?: string;
  },
): LifeDrilldownView {
  const reference = options.reference ?? new Date();
  const { items, consequences } = options;
  const backLabel = options.backLabel ?? "Today";

  if (target.kind === "day") {
    return buildDayDrilldown(target, consequences, items, reference, backLabel);
  }

  if (target.kind === "money") {
    return buildMoneyDrilldown(target, consequences, items, reference, backLabel);
  }

  if (target.kind === "pattern" || target.kind === "health") {
    return buildHealthDrilldown(target, consequences, items, reference, backLabel);
  }

  if (target.kind === "routine") {
    return buildRoutineDrilldown(target, items, consequences, reference, backLabel);
  }

  if (target.kind === "memory" && target.sourceMemoryIds?.length) {
    return buildMemoryDrilldown(target, items, reference, backLabel);
  }

  if (target.kind === "family" || target.kind === "relationship") {
    const area = target.kind === "family" ? "family" : "relationships";
    const timeline = collectAreaEntries(area, consequences, items, reference, 4).map(
      (entry) => ({
        ...entry,
        text: formatAreaEntryText(entry),
      }),
    );
    return {
      target,
      title: target.kind === "family" ? "Family" : "Relationships",
      lede:
        target.kind === "family"
          ? "What matters at home."
          : "What matters in your close circle.",
      timeline,
      contextLines: [],
      backLabel,
    };
  }

  if (target.kind === "work") {
    const workEntries = collectAreaEntries("work", consequences, items, reference, 4).map(
      (entry) => ({
        ...entry,
        text: formatAreaEntryText(entry),
      }),
    );
    const routine = items.find((item) => item.category === "workday");
    const contextLines: string[] = [];
    if (routine) {
      contextLines.push(
        resolveMemoryUnderstanding(routine, reference).replace(/\.$/, "") + ".",
      );
    }
    return {
      target,
      title: "Work",
      lede: "Your routine.",
      timeline: workEntries,
      contextLines,
      backLabel,
    };
  }

  const threadItems =
    target.thread != null
      ? itemsInSameThread(
          items.find((i) => target.sourceMemoryIds?.includes(i.id)) ?? items[0],
          items,
          reference,
        )
      : [];

  return {
    target,
    title: target.label,
    lede: "Here's the context Sync is holding.",
    timeline: threadItems.slice(0, 4).map((item) => ({
      id: item.id,
      time: null,
      text: resolveMemoryUnderstanding(item, reference),
    })),
    contextLines: [],
    backLabel,
  };
}

/** Future My Life explorer: areas derived from captured data only. */
export type LifeExplorerArea = {
  id: string;
  label: string;
  drilldown: LifeDrilldownTarget;
  memoryCount: number;
};

export function discoverLifeExplorerAreas(
  items: CapturedSyncItem[],
  consequences: SyncConsequence[],
  reference = new Date(),
): LifeExplorerArea[] {
  const areas = new Map<string, LifeExplorerArea>();

  for (const item of items) {
    if (item.deletedAt || item.status === "cancelled") continue;
    const profile = buildMemoryProfile(item, reference);
    const label = profile.area;
    if (label === "Personal" || label === "Calendar") continue;

    const existing = areas.get(label);
    if (existing) {
      existing.memoryCount += 1;
      continue;
    }

    areas.set(label, {
      id: `life-area-${label.toLowerCase()}`,
      label,
      memoryCount: 1,
      drilldown: {
        id: `drilldown-area-${label.toLowerCase()}`,
        kind:
          label === "Money"
            ? "money"
            : label === "Family"
              ? "family"
              : label === "Relationships"
                ? "relationship"
                : label === "Health"
                  ? "health"
                  : label === "Work"
                    ? "work"
                    : "day",
        label,
        area: profile.area,
        confidence: "medium",
      },
    });
  }

  return [...areas.values()].sort((a, b) => b.memoryCount - a.memoryCount);
}
