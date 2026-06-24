import type { CapturedSyncItem } from "@/lib/captured-items";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import type { MemoryArea } from "@/lib/intelligence/memory-profile";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import type { MemoryThread } from "@/lib/intelligence/memory-thread";
import { buildThreadPatternInsight, resolveMemoryThread } from "@/lib/intelligence/memory-thread";
import type { MemoryWeight } from "@/lib/intelligence/memory-weight";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import {
  cleanSurfacedCopy,
  isAwkwardSurfacedLine,
} from "@/lib/sync-capture/surface-copy";
import { formatSyncClock } from "@/lib/sync-time-blocks";

export type DrilldownKind =
  | "day"
  | "timeline"
  | "money"
  | "family"
  | "relationship"
  | "health"
  | "work"
  | "routine"
  | "memory"
  | "pattern";

export type LifeDrilldownTarget = {
  id: string;
  kind: DrilldownKind;
  label: string;
  area?: MemoryArea;
  dateKey?: string | null;
  dayOffset?: number | null;
  sourceMemoryIds?: string[];
  thread?: MemoryThread;
  weight?: MemoryWeight;
  confidence?: "high" | "medium" | "low";
};

export type ConsequenceLink = {
  text: string;
  drilldown: LifeDrilldownTarget | null;
};

function addDaysKey(reference: Date, offset: number) {
  const next = new Date(reference);
  next.setDate(next.getDate() + offset);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function memoryText(item: CapturedSyncItem) {
  const prompt = (item.originalPrompt ?? item.prompt).trim();
  return `${item.title} ${normalizeCaptureInput(prompt).normalized}`.toLowerCase();
}

function kindForConsequence(consequence: SyncConsequence): DrilldownKind {
  const area = consequence.area.toLowerCase();
  const text = consequence.surfaceText.toLowerCase();
  if (consequence.kind === "income" || consequence.kind === "financial_due") {
    return "money";
  }
  if (consequence.kind === "family_moment") return "family";
  if (consequence.kind === "relationship_moment") return "relationship";
  if (consequence.kind === "work_start" || consequence.kind === "work_stretch") {
    return "work";
  }
  if (consequence.kind === "health_log") return "health";
  if (/\b(daughter|son|school|take .+ to school)\b/.test(text)) return "family";
  if (/\b(friend'?s? birthday|anniversary|partner)\b/.test(text)) {
    return "relationship";
  }
  if (area === "finance") return "money";
  if (area === "family") return "family";
  if (area === "relationships") return "relationship";
  if (area === "health") return "health";
  if (area === "work") return "work";
  if (consequence.daysUntil === 1 || consequence.daysUntil === 0) return "day";
  return "day";
}

function areaForKind(kind: DrilldownKind): MemoryArea | undefined {
  switch (kind) {
    case "money":
      return "Money";
    case "family":
      return "Family";
    case "relationship":
      return "Relationships";
    case "health":
      return "Health";
    case "work":
    case "routine":
      return "Work";
    default:
      return undefined;
  }
}

export function buildDrilldownForConsequence(
  consequence: SyncConsequence,
  items: CapturedSyncItem[],
  reference = new Date(),
): LifeDrilldownTarget {
  const kind = kindForConsequence(consequence);
  const source = consequence.sourceMemoryId
    ? items.find((item) => item.id === consequence.sourceMemoryId)
    : null;
  const weight = source
    ? effectiveMemoryWeight(source, items, reference)
    : undefined;
  const profile = source ? buildMemoryProfile(source, reference) : null;
  const thread = source && profile
    ? resolveMemoryThread(profile, memoryText(source))
    : undefined;

  return {
    id: `drilldown-${consequence.id}`,
    kind,
    label: drilldownLabelForKind(kind, consequence),
    area: areaForKind(kind),
    dateKey: consequence.dateKey,
    dayOffset: consequence.daysUntil,
    sourceMemoryIds: consequence.sourceMemoryId
      ? [consequence.sourceMemoryId]
      : undefined,
    thread: thread ?? undefined,
    weight,
    confidence: profile?.confidence,
  };
}

function drilldownLabelForKind(kind: DrilldownKind, consequence: SyncConsequence) {
  if (kind === "money") {
    if (consequence.kind === "income") return "Payday";
    if (/\brent\b/i.test(consequence.surfaceText)) return "Rent";
    return "Money";
  }
  if (kind === "day") {
    if (consequence.daysUntil === 0) return "Today";
    if (consequence.daysUntil === 1) return "Tomorrow";
    return "This day";
  }
  if (kind === "family") return "Family";
  if (kind === "relationship") return "Relationships";
  if (kind === "health") return "How you've been feeling";
  if (kind === "work") return "Work";
  return "Context";
}

export function buildDrilldownForInsight(
  insight: string,
  consequences: SyncConsequence[],
  reference = new Date(),
): LifeDrilldownTarget | null {
  const normalized = insight.toLowerCase();

  if (/tomorrow/.test(normalized)) {
    return {
      id: "drilldown-tomorrow",
      kind: "day",
      label: "Tomorrow",
      dayOffset: 1,
      dateKey: addDaysKey(reference, 1),
      confidence: "high",
    };
  }

  if (/today/.test(normalized) && /busy|early|spoken/.test(normalized)) {
    return {
      id: "drilldown-today",
      kind: "day",
      label: "Today",
      dayOffset: 0,
      dateKey: addDaysKey(reference, 0),
      confidence: "high",
    };
  }

  if (/payday|rent|money|finance/.test(normalized)) {
    const money = consequences.find(
      (c) => c.kind === "income" || c.kind === "financial_due",
    );
    if (money) {
      return buildDrilldownForConsequence(money, [], reference);
    }
    return {
      id: "drilldown-money",
      kind: "money",
      label: "Money",
      area: "Money",
      confidence: "medium",
    };
  }

  if (/stress|feeling|emotional/.test(normalized)) {
    return {
      id: "drilldown-emotional",
      kind: "pattern",
      label: "How you've been feeling",
      area: "Health",
      thread: "emotional",
      confidence: "medium",
    };
  }

  return null;
}

export function buildDrilldownForPattern(
  patternText: string,
  items: CapturedSyncItem[],
  reference = new Date(),
): LifeDrilldownTarget {
  const emotional = items.find((item) => {
    const profile = buildMemoryProfile(item, reference);
    return resolveMemoryThread(profile, memoryText(item)) === "emotional";
  });

  return {
    id: "drilldown-pattern-emotional",
    kind: "pattern",
    label: "How you've been feeling",
    area: "Health",
    thread: "emotional",
    sourceMemoryIds: emotional ? [emotional.id] : undefined,
    confidence: "medium",
  };
}

const WEIGHT_SCORE: Record<MemoryWeight, number> = {
  light: 0,
  important: 100,
  meaningful: 200,
  critical: 300,
};

function timeRelevanceScore(daysUntil: number | null) {
  if (daysUntil == null) return 10;
  if (daysUntil === 0) return 80;
  if (daysUntil === 1) return 70;
  if (daysUntil <= 7) return 40;
  if (daysUntil <= 14) return 20;
  return 5;
}

export function scoreConsequenceForTodaySurface(
  consequence: SyncConsequence,
  items: CapturedSyncItem[],
  reference: Date,
): number {
  if (!consequence.briefEligible) return -1;
  if (consequence.horizon === "background") return -1;
  if (consequence.kind === "ambient" || consequence.kind === "health_log") {
    return -1;
  }

  const source = consequence.sourceMemoryId
    ? items.find((item) => item.id === consequence.sourceMemoryId)
    : null;
  const weight = source
    ? effectiveMemoryWeight(source, items, reference)
    : consequence.kind === "work_start"
      ? "important"
      : "important";

  if (weight === "light") return -1;

  let score = WEIGHT_SCORE[weight];
  score += timeRelevanceScore(consequence.daysUntil);
  score -= Math.min(consequence.priority, 50);

  if (consequence.kind === "income") score += 15;
  if (consequence.kind === "financial_due") score += 25;
  if (/\bflight\b/i.test(consequence.surfaceText)) score += 30;
  if (consequence.kind === "family_moment") score += 25;
  if (consequence.kind === "work_start" && consequence.daysUntil === 1) {
    score += 10;
  }

  return score;
}

export function pickBestSupportingConsequence(
  insight: string,
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
): SyncConsequence | null {
  const insightNorm = insight.toLowerCase();

  const ranked = consequences
    .filter((consequence) => {
      if (!consequence.briefEligible || consequence.horizon !== "coming_soon") {
        return false;
      }
      const text = consequence.surfaceText.toLowerCase();
      if (insightNorm.includes(text.replace(/\.$/, ""))) return false;
      if (text.includes(insightNorm.replace(/\.$/, ""))) return false;
      return scoreConsequenceForTodaySurface(consequence, items, reference) >= 0;
    })
    .sort(
      (a, b) =>
        scoreConsequenceForTodaySurface(b, items, reference) -
        scoreConsequenceForTodaySurface(a, items, reference),
    );

  return ranked[0] ?? null;
}

export function pickPatternSupportingLine(
  items: CapturedSyncItem[],
  reference: Date,
): ConsequenceLink | null {
  for (const item of items) {
    const insight = buildThreadPatternInsight(item, items, reference);
    if (insight) {
      return {
        text: insight,
        drilldown: buildDrilldownForPattern(insight, items, reference),
      };
    }
  }
  return null;
}

export function isAwkwardBriefLine(line: string) {
  return isAwkwardSurfacedLine(line);
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
    "work begins",
    "work starts",
    "birthday",
    "rent",
    "flight",
    "daughter",
    "school",
  ];

  return sharedTopics.some(
    (topic) => left.includes(topic) && right.includes(topic),
  );
}

function formatMinutesLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const raw = `${hour}:${String(minute).padStart(2, "0")}`;
  return formatSyncClock(raw) ?? raw;
}

function extractTimeFromSurface(text: string) {
  const match = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM)?)\b/i);
  return match?.[1] ?? null;
}

export function personalizePriorityDetailText(
  consequence: SyncConsequence,
  selected: SyncConsequence[],
  allTomorrow: SyncConsequence[],
): string {
  const text = consequence.surfaceText.replace(/\.$/, "");
  const lower = text.toLowerCase();

  if (consequence.kind === "income" || /\bpayday\b/.test(lower)) {
    const timedTomorrow = allTomorrow
      .filter((item) => item.sortMinutes != null)
      .sort((a, b) => (a.sortMinutes ?? 0) - (b.sortMinutes ?? 0));
    const earliest = timedTomorrow[0];
    const hasWork = allTomorrow.some((item) => item.kind === "work_start");

    if (earliest?.id === consequence.id) {
      const time =
        consequence.sortMinutes != null
          ? formatMinutesLabel(consequence.sortMinutes)
          : extractTimeFromSurface(text);
      return time ? `Payday arrives first at ${time}.` : "Payday arrives first.";
    }

    if (hasWork) {
      return "Payday lands before work.";
    }

    const time =
      consequence.sortMinutes != null
        ? formatMinutesLabel(consequence.sortMinutes)
        : extractTimeFromSurface(text);
    if (time && !lower.includes(time.toLowerCase())) {
      return `Payday at ${time}.`;
    }
    return "Payday lands tomorrow.";
  }

  if (/\bflight\b/i.test(lower)) {
    const time =
      consequence.sortMinutes != null
        ? formatMinutesLabel(consequence.sortMinutes)
        : extractTimeFromSurface(text);
    if (time && !lower.includes(time.toLowerCase())) {
      return `Flight at ${time}.`;
    }
    return text.endsWith(".") ? text : `${text}.`;
  }

  if (consequence.kind === "work_start") {
    const match = text.match(/work (?:starts|begins)(?: at)? (.+)/i);
    const time = match?.[1]?.trim() ?? extractTimeFromSurface(text);
    if (time) {
      return `Work starts at ${time.replace(/\.$/, "")}.`;
    }
  }

  return cleanSurfacedCopy(text.endsWith(".") ? text : `${text}.`);
}

export function pickPriorityDetailConsequences(
  insight: string,
  consequences: SyncConsequence[],
  items: CapturedSyncItem[],
  reference: Date,
  max = 3,
): SyncConsequence[] {
  const insightNorm = insight.toLowerCase();
  const tomorrow = consequences.filter(
    (consequence) =>
      consequence.daysUntil === 1 && consequence.briefEligible,
  );

  const ranked = consequences
    .filter((consequence) => {
      if (!consequence.briefEligible) return false;
      if (consequence.horizon !== "coming_soon") return false;
      if (consequence.kind === "day_synthesis" || consequence.kind === "ambient") {
        return false;
      }
      if (isAwkwardBriefLine(consequence.surfaceText)) return false;
      if (scoreConsequenceForTodaySurface(consequence, items, reference) < 0) {
        return false;
      }

      const text = consequence.surfaceText.toLowerCase();
      if (insightNorm.includes(text.replace(/\.$/, ""))) return false;
      if (text.includes(insightNorm.replace(/\.$/, ""))) return false;
      return true;
    })
    .sort((a, b) => {
      const scoreDiff =
        scoreConsequenceForTodaySurface(b, items, reference) -
        scoreConsequenceForTodaySurface(a, items, reference);
      if (Math.abs(scoreDiff) > 15) return scoreDiff;

      const dayA = a.daysUntil ?? 99;
      const dayB = b.daysUntil ?? 99;
      if (dayA !== dayB) return dayA - dayB;

      const minuteA = a.sortMinutes ?? 24 * 60;
      const minuteB = b.sortMinutes ?? 24 * 60;
      if (minuteA !== minuteB) return minuteA - minuteB;

      return a.priority - b.priority;
    });

  const selected: SyncConsequence[] = [];

  for (const consequence of ranked) {
    if (selected.length >= max) break;

    const personalized = personalizePriorityDetailText(
      consequence,
      selected,
      tomorrow,
    );

    if (isAwkwardBriefLine(personalized)) continue;
    if (selected.some((item) => briefFactsOverlap(item.surfaceText, personalized))) {
      continue;
    }

    selected.push({
      ...consequence,
      surfaceText: personalized,
    });
  }

  return selected;
}
