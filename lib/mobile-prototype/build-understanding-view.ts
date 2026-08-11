import type { CapturedSyncItem } from "@/lib/captured-items";
import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import { personalizePriorityDetailText } from "@/lib/intelligence/consequence-link";
import {
  buildMemoryProfile,
  type MemoryProfile,
} from "@/lib/intelligence/memory-profile";
import { resolveMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import { buildThreadPatternInsight } from "@/lib/intelligence/memory-thread";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";

export type UnderstandingConfidence = "low" | "medium" | "high";

export type UnderstandingRow = {
  id:
    | "money"
    | "work"
    | "health"
    | "family"
    | "relationships"
    | "routines"
    | "goals";
  label: string;
  summary: string;
  confidence: UnderstandingConfidence;
  evidencePoints: string[];
  lastUpdated: string;
  target: LifeDrilldownTarget | null;
};

export type UnderstandingView = {
  title: string;
  lede: string;
  rows: UnderstandingRow[];
  isEmpty: boolean;
};

function activeItems(items: CapturedSyncItem[]) {
  return items.filter((item) => item.status !== "cancelled" && !item.deletedAt);
}

function areaForProfile(profile: MemoryProfile) {
  return profile.area.toLowerCase();
}

function topConsequenceForArea(
  areaId: UnderstandingRow["id"],
  consequences: SyncConsequence[],
): SyncConsequence | null {
  const ranked = consequences
    .filter((consequence) => {
      if (!consequence.briefEligible) return false;
      if (consequence.horizon === "background") return false;
      const area = consequence.area.toLowerCase();
      if (areaId === "money") return area === "money" || area === "finance";
      if (areaId === "work") return area === "work";
      if (areaId === "health") return area === "health";
      if (areaId === "family") return area === "family";
      if (areaId === "relationships") return area === "relationships" || area === "relationship";
      return false;
    })
    .sort((a, b) => a.priority - b.priority);

  return ranked[0] ?? null;
}

function confidenceLevel(input: {
  itemCount: number;
  hasConsequence: boolean;
  hasPattern: boolean;
}): UnderstandingConfidence {
  const score =
    (input.hasConsequence ? 2 : 0) +
    (input.hasPattern ? 1 : 0) +
    Math.min(2, input.itemCount);

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function formatLastUpdated(items: CapturedSyncItem[]): string {
  const latest = items
    .map((item) => new Date(item.updatedAt).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];

  if (!latest) return "Just now";
  const minutes = Math.max(0, Math.round((Date.now() - latest) / 60000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function areaTarget(areaId: UnderstandingRow["id"]): LifeDrilldownTarget | null {
  switch (areaId) {
    case "money":
      return { id: "drilldown-area-money", kind: "money", label: "Money", area: "Money", confidence: "medium" };
    case "work":
      return { id: "drilldown-area-work", kind: "work", label: "Work", area: "Work", confidence: "medium" };
    case "health":
      return { id: "drilldown-area-health", kind: "health", label: "Health", area: "Health", confidence: "medium" };
    case "family":
      return { id: "drilldown-area-family", kind: "family", label: "Family", area: "Family", confidence: "medium" };
    case "relationships":
      return {
        id: "drilldown-area-relationships",
        kind: "relationship",
        label: "Relationships",
        area: "Relationships",
        confidence: "medium",
      };
    case "routines":
      return { id: "drilldown-routines", kind: "routine", label: "Routines", area: "Work", confidence: "medium" };
    case "goals":
      return null;
    default:
      return null;
  }
}

function buildAreaRow(input: {
  id: Extract<UnderstandingRow["id"], "money" | "work" | "health" | "family" | "relationships">;
  label: string;
  items: CapturedSyncItem[];
  consequences: SyncConsequence[];
  reference: Date;
}): UnderstandingRow | null {
  const areaItems = input.items.filter((item) => areaForProfile(buildMemoryProfile(item, input.reference)) === input.id);
  const topConsequence = topConsequenceForArea(input.id, input.consequences);
  const recent = areaItems[0] ?? null;
  const pattern = recent ? buildThreadPatternInsight(recent, input.items, input.reference) : null;

  if (areaItems.length === 0 && !topConsequence) return null;

  const summary = topConsequence
    ? personalizePriorityDetailText(topConsequence, [], input.consequences.filter((c) => c.daysUntil === 1)).replace(/\.$/, "")
    : (pattern ?? (recent ? resolveMemoryUnderstanding(recent, input.reference).replace(/\.$/, "") : `${input.label} context noted.`));

  const evidencePoints = topConsequence
    ? [
        `Consequence: ${topConsequence.surfaceText.replace(/\.$/, "")}`,
        "Signal: recent time-sensitive item",
      ]
    : pattern
      ? [pattern.replace(/\.$/, ""), "Signal: repeated memory pattern"]
      : recent
        ? [
            `Recent memory: ${resolveMemoryUnderstanding(recent, input.reference).replace(/\.$/, "")}`,
          ]
        : ["Recent memory context"];

  return {
    id: input.id,
    label: input.label,
    summary,
    confidence: confidenceLevel({
      itemCount: areaItems.length,
      hasConsequence: Boolean(topConsequence),
      hasPattern: Boolean(pattern),
    }),
    evidencePoints: evidencePoints.slice(0, 3),
    lastUpdated: formatLastUpdated(areaItems),
    target: areaTarget(input.id),
  };
}

function buildRoutineRow(items: CapturedSyncItem[], reference: Date): UnderstandingRow | null {
  const routineItems = items.filter((item) => {
    const profile = buildMemoryProfile(item, reference);
    return profile.type === "routine" || profile.type === "habit" || profile.accumulation === "routine";
  });
  if (routineItems.length === 0) return null;

  const recent = routineItems[0];
  const pattern = buildThreadPatternInsight(recent, items, reference);

  return {
    id: "routines",
    label: "Routines",
    summary: (pattern ?? "Recurring patterns are starting to take shape.").replace(/\.$/, ""),
    confidence: confidenceLevel({
      itemCount: routineItems.length,
      hasConsequence: false,
      hasPattern: Boolean(pattern),
    }),
    evidencePoints: [
      pattern ? pattern.replace(/\.$/, "") : "Recurring routine captures",
      "Signal: behavior repeated over time",
    ],
    lastUpdated: formatLastUpdated(routineItems),
    target: areaTarget("routines"),
  };
}

function buildGoalsRow(items: CapturedSyncItem[], reference: Date): UnderstandingRow | null {
  const goalItems = items.filter((item) => {
    const profile = buildMemoryProfile(item, reference);
    return (
      profile.type === "goal" ||
      profile.type === "concern" ||
      profile.type === "preference" ||
      profile.type === "idea"
    );
  });
  if (goalItems.length === 0) return null;

  const recent = goalItems[0];
  return {
    id: "goals",
    label: "Goals / Direction",
    summary: resolveMemoryUnderstanding(recent, reference).replace(/\.$/, ""),
    confidence: confidenceLevel({
      itemCount: goalItems.length,
      hasConsequence: false,
      hasPattern: false,
    }),
    evidencePoints: [
      "Goal, concern, or direction-related captures",
      `Latest: ${resolveMemoryUnderstanding(recent, reference).replace(/\.$/, "")}`,
    ],
    lastUpdated: formatLastUpdated(goalItems),
    target: null,
  };
}

export function buildUnderstandingView(input: {
  items: CapturedSyncItem[];
  consequences: SyncConsequence[];
  reference?: Date;
}): UnderstandingView {
  const reference = input.reference ?? new Date();
  const items = activeItems(input.items);
  const rows: UnderstandingRow[] = [];

  const coreAreas: Array<{ id: Extract<UnderstandingRow["id"], "money" | "work" | "health" | "family" | "relationships">; label: string }> = [
    { id: "money", label: "Money" },
    { id: "work", label: "Work" },
    { id: "health", label: "Health" },
    { id: "family", label: "Family" },
    { id: "relationships", label: "Relationships" },
  ];

  for (const area of coreAreas) {
    const row = buildAreaRow({
      id: area.id,
      label: area.label,
      items,
      consequences: input.consequences,
      reference,
    });
    if (row) rows.push(row);
  }

  const routines = buildRoutineRow(items, reference);
  if (routines) rows.push(routines);

  const goals = buildGoalsRow(items, reference);
  if (goals) rows.push(goals);

  return {
    title: "Understanding",
    lede: "Here is what Sync understands about your life so far.",
    rows,
    isEmpty: rows.length === 0,
  };
}
