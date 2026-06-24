import type { CapturedSyncItem } from "@/lib/captured-items";
import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import {
  personalizePriorityDetailText,
  scoreConsequenceForTodaySurface,
} from "@/lib/intelligence/consequence-link";
import { formatItemTimePhrase } from "@/lib/intelligence/consequence-timing";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { resolveMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import { buildThreadPatternInsight } from "@/lib/intelligence/memory-thread";
import type { MemoryArea } from "@/lib/intelligence/memory-profile";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { assessTomorrowLoad, headlineForTomorrowLoad } from "@/lib/intelligence/life-load";
import { buildLifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import { memoryFilterCategory } from "@/lib/mobile-prototype/memory-category";

export type MyLifeRow = {
  id: string;
  label: string;
  summary: string;
  target: LifeDrilldownTarget;
};

export type MyLifeOverview = {
  lede: string;
  rows: MyLifeRow[];
  isEmpty: boolean;
};

const AREA_KIND: Record<
  Exclude<MemoryArea, "Personal" | "Calendar">,
  LifeDrilldownTarget["kind"]
> = {
  Money: "money",
  Family: "family",
  Relationships: "relationship",
  Health: "health",
  Work: "work",
};

function consequenceAreaMatches(area: MemoryArea, consequenceArea: string) {
  const normalized = consequenceArea.toLowerCase();
  if (area === "Money") {
    return normalized === "money" || normalized === "finance";
  }
  if (area === "Relationships") {
    return normalized === "relationships" || normalized === "relationship";
  }
  return normalized === area.toLowerCase();
}

function topConsequenceForArea(
  area: MemoryArea,
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
): SyncConsequence | null {
  const ranked = consequences
    .filter((consequence) => {
      if (!consequence.briefEligible) return false;
      if (consequence.horizon === "background") return false;
      if (scoreConsequenceForTodaySurface(consequence, items, reference) < 0) {
        return false;
      }
      return consequenceAreaMatches(area, consequence.area);
    })
    .sort(
      (a, b) =>
        scoreConsequenceForTodaySurface(b, items, reference) -
        scoreConsequenceForTodaySurface(a, items, reference),
    );

  return ranked[0] ?? null;
}

function areaHasMemories(
  area: MemoryArea,
  items: CapturedSyncItem[],
  reference: Date,
) {
  return items.some((item) => {
    if (item.deletedAt || item.status === "cancelled") return false;
    const profile = buildMemoryProfile(item, reference);
    return profile.area === area;
  });
}

function summaryForArea(
  area: MemoryArea,
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
): string | null {
  if (area === "Calendar") return null;

  if (area === "Money") {
    const moneyItems = items.filter((item) => {
      if (item.deletedAt || item.status === "cancelled") return false;
      return memoryFilterCategory(item) === "Money";
    });

    const lightOnly =
      moneyItems.length > 0 &&
      moneyItems.every(
        (item) => effectiveMemoryWeight(item, items, reference) === "light",
      );

    if (lightOnly) {
      return "Small money note saved.";
    }

    const top = topConsequenceForArea(area, consequences, items, reference);
    if (top) {
      const tomorrow = consequences.filter((c) => c.daysUntil === 1);
      return personalizePriorityDetailText(top, [], tomorrow).replace(/\.$/, "");
    }

    const recent = moneyItems[0];
    if (recent) {
      return resolveMemoryUnderstanding(recent, reference).replace(/\.$/, "");
    }
    return null;
  }

  const top = topConsequenceForArea(area, consequences, items, reference);
  if (top) {
    const tomorrow = consequences.filter((c) => c.daysUntil === 1);
    return personalizePriorityDetailText(top, [], tomorrow).replace(/\.$/, "");
  }

  if (area === "Health") {
    const workout = items.find((item) => {
      const profile = buildMemoryProfile(item, reference);
      return (
        profile.area === "Health" &&
        (profile.type === "habit" || item.category === "workout") &&
        profile.timeRelevance !== "past"
      );
    });
    if (workout) {
      const phrase = formatItemTimePhrase(workout, reference);
      if (phrase) return `Workout ${phrase.replace(/^Today at /i, "today at ").replace(/^Tonight at /i, "tonight at ")}`;
      return displayMemoryTitle(workout);
    }

    for (const item of items) {
      const profile = buildMemoryProfile(item, reference);
      if (profile.area !== "Health") continue;
      const insight = buildThreadPatternInsight(item, items, reference);
      if (insight) return insight.replace(/\.$/, "");
    }
    const recent = items.find((item) => {
      const profile = buildMemoryProfile(item, reference);
      return profile.area === "Health" && profile.type === "emotion";
    });
    if (recent) {
      const profile = buildMemoryProfile(recent, reference);
      return profile.timeRelevance === "today"
        ? "Emotional check-in noted today."
        : "Emotional check-in noted recently.";
    }
  }

  if (area === "Work") {
    const work = consequences.find((c) => c.kind === "work_start" || c.kind === "work_off");
    if (work) return work.surfaceText.replace(/\.$/, "");

    const projectItem = items.find((item) => {
      if (item.deletedAt || item.status === "cancelled") return false;
      const profile = buildMemoryProfile(item, reference);
      if (profile.area !== "Work") return false;
      const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
      return (
        profile.timeRelevance === "today" ||
        profile.timeRelevance === "tomorrow" ||
        /\b(worked|project|coded|coding)\b/.test(text)
      );
    });
    if (projectItem) {
      const title = displayMemoryTitle(projectItem);
      const phrase = formatItemTimePhrase(projectItem, reference);
      const projectProfile = buildMemoryProfile(projectItem, reference);
      if (phrase) {
        return `${title} ${phrase.replace(/^Today at /i, "today ").replace(/^Tonight at /i, "tonight ")}`;
      }
      return projectProfile.timeRelevance === "today"
        ? `${title} today.`
        : title;
    }
  }

  if (area === "Personal") {
    const personal = items.find((item) => {
      if (item.deletedAt || item.status === "cancelled") return false;
      if (memoryFilterCategory(item) === "Money") return false;
      return buildMemoryProfile(item, reference).area === "Personal";
    });
  if (personal) {
    const profile = buildMemoryProfile(personal, reference);
    const title = displayMemoryTitle(personal);
    const phrase = formatItemTimePhrase(personal, reference);
    if (profile.type === "emotion") {
      return profile.timeRelevance === "today"
        ? "Emotional check-in noted today."
        : "Emotional check-in noted recently.";
    }
    return phrase ? `${title} · ${phrase}` : title;
  }
}

  return null;
}

function drilldownForArea(
  area: Exclude<MemoryArea, "Calendar">,
): LifeDrilldownTarget {
  if (area === "Personal") {
    return {
      id: "drilldown-area-personal",
      kind: "day",
      label: "Personal",
      area: "Personal",
      confidence: "medium",
    };
  }
  return {
    id: `drilldown-area-${area.toLowerCase()}`,
    kind: AREA_KIND[area],
    label: area,
    area,
    confidence: "medium",
  };
}

export function buildMyLifeOverview(input: {
  items: CapturedSyncItem[];
  consequences: SyncConsequence[];
  reference?: Date;
}): MyLifeOverview {
  const reference = input.reference ?? new Date();
  const { items, consequences } = input;
  const rows: MyLifeRow[] = [];

  const timeline = buildLifeTimelineView({ consequences, items, reference });
  if (!timeline.isEmpty) {
    const assessment = assessTomorrowLoad(consequences);
    const headline = headlineForTomorrowLoad(assessment, consequences);
    rows.push({
      id: "life-timeline",
      label: "Life Timeline",
      summary:
        headline?.replace(/\.$/, "") ??
        timeline.previewLine ??
        "What's coming in time order.",
      target: {
        id: "drilldown-life-timeline",
        kind: "timeline",
        label: "Life Timeline",
        confidence: "high",
      },
    });
  }

  const areaOrder: MemoryArea[] = [
    "Money",
    "Relationships",
    "Family",
    "Work",
    "Health",
    "Personal",
  ];

  for (const area of areaOrder) {
    if (area === "Calendar") continue;
    if (area === "Personal") {
      const hasStrongerAreas = rows.some((row) =>
        ["Money", "Family", "Relationships", "Work", "Health"].includes(row.label),
      );
      const onlyLightPersonal = items.every((item) => {
        if (item.deletedAt || item.status === "cancelled") return true;
        if (memoryFilterCategory(item) === "Money") return true;
        const profile = buildMemoryProfile(item, reference);
        if (profile.area !== "Personal") return true;
        return effectiveMemoryWeight(item, items, reference) === "light";
      });
      if (hasStrongerAreas && onlyLightPersonal) continue;
    }

    const hasData =
      areaHasMemories(area, items, reference) ||
      consequences.some(
        (c) =>
          consequenceAreaMatches(area, c.area) &&
          scoreConsequenceForTodaySurface(c, items, reference) >= 0,
      );

    if (!hasData) continue;

    const summary = summaryForArea(area, consequences, items, reference);
    if (!summary) continue;

    rows.push({
      id: `my-life-${area.toLowerCase()}`,
      label: area,
      summary,
      target: drilldownForArea(area),
    });
  }

  const routineItems = items.filter((item) => {
    const profile = buildMemoryProfile(item, reference);
    return profile.accumulation === "routine" || item.category === "workday";
  });
  if (
    routineItems.length > 0 &&
    !rows.some((row) => row.label === "Work")
  ) {
    rows.push({
      id: "my-life-routines",
      label: "Routines",
      summary: "Recurring rhythms Sync has picked up.",
      target: {
        id: "drilldown-routines",
        kind: "routine",
        label: "Routines",
        area: "Work",
        confidence: "medium",
      },
    });
  }

  return {
    lede: "What Sync is holding.",
    rows,
    isEmpty: rows.length === 0,
  };
}

export function resolveLifeScreenForTarget(
  target: LifeDrilldownTarget,
): "timeline" | "area" {
  if (target.kind === "timeline" || target.kind === "day") {
    return "timeline";
  }
  return "area";
}
