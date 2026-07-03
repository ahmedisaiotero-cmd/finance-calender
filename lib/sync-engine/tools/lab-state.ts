import type { CapturedSyncItem } from "@/lib/captured-items";
import { effectiveMemoryWeight } from "@/lib/intelligence/memory-aging";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import type { DailyBriefSnapshot } from "@/lib/mobile-prototype/build-daily-brief";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import type { SyncEngineMessageResult } from "@/lib/sync-engine";

export type SyncLabMemoryRow = {
  id: string;
  title: string;
  category: string;
  importance: string;
  createdDate: string;
  updatedDate: string;
  rawInput: string;
  timesReferenced: number;
  confidence: number;
  source: "stored" | "test";
  visibility: SyncLabMemoryVisibility;
  relatedMemoryIds: string[];
};

export type SyncLabBriefPreview = {
  lede: string;
  lines: string[];
  isEmpty: boolean;
};

export type SyncLabReviewGroupName =
  | "Health"
  | "Money"
  | "Work"
  | "Family"
  | "Relationships"
  | "Routines"
  | "Other";

export type SyncLabReviewItem = {
  id: string;
  source: "stored" | "test";
  thinks: string;
  evidence: string[];
  confidence: number;
  confidenceLabel: "low" | "medium" | "high";
};

export type SyncLabReviewGroup = {
  name: SyncLabReviewGroupName;
  items: SyncLabReviewItem[];
};

export const SYNC_LAB_CONTEXT_DEFAULT = false;
export const SYNC_LAB_TEST_MEMORY_STORAGE_KEY = "sync.lab.testMemories";
export const SYNC_LAB_MEMORY_VISIBILITY_STORAGE_KEY =
  "sync.lab.memoryVisibility";
export const SYNC_LAB_MEMORY_VISIBILITY_DEFAULT = "internal";
export const SYNC_LAB_REVIEW_VISIBLE_LIMIT = 3;

export type SyncLabMemoryVisibility = "internal" | "visible";
export type SyncLabMemoryVisibilityFilter =
  | SyncLabMemoryVisibility
  | "all";

export type SyncLabMemoryVisibilityMap = Record<
  string,
  SyncLabMemoryVisibility
>;

export type SyncLabMemoryContext = {
  storedMemories: CapturedSyncItem[];
  labMemories: CapturedSyncItem[];
  combinedMemories: CapturedSyncItem[];
  contextEnabled: boolean;
  storedMemoryCount: number;
  labMemoryCount: number;
};

function activeItem(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function confidenceForMemory(item: CapturedSyncItem) {
  return item.timeline?.confidence ?? 0.5;
}

function confidenceLabel(value: number): SyncLabReviewItem["confidenceLabel"] {
  if (value >= 0.72) return "high";
  if (value >= 0.45) return "medium";
  return "low";
}

function visibilityForMemory(
  id: string,
  visibility?: SyncLabMemoryVisibilityMap,
) {
  return visibility?.[id] ?? SYNC_LAB_MEMORY_VISIBILITY_DEFAULT;
}

export function memoryFromSyncEngineResult(
  result: SyncEngineMessageResult,
  createdAt = new Date(),
): CapturedSyncItem | null {
  if (!result.debug.wouldCreateMemory || !result.prepared) return null;

  const { prepared } = result;
  const timestamp = createdAt.toISOString();

  return {
    id: prepared.plan.id,
    title: prepared.title,
    category: prepared.plan.category,
    prompt: prepared.plan.prompt,
    originalPrompt: prepared.plan.originalPrompt,
    normalizationCorrections: prepared.plan.normalizationCorrections,
    destinations: prepared.destinations,
    dateLabel: prepared.plan.dateLabel,
    timeLabel: prepared.plan.timeLabel,
    amount: prepared.plan.parsedInput?.amount ?? null,
    frequency: prepared.plan.parsedInput?.frequency,
    moneyType: prepared.plan.parsedInput?.moneyType,
    workAvailability: prepared.plan.parsedInput?.workAvailability,
    timeline: prepared.plan.timeline,
    meaning: prepared.meaning,
    understanding: syncLabDisplayResponse(result),
    captureSource: "typed",
    status: "active",
    createdAt: prepared.plan.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export function syncLabDisplayResponse(result: SyncEngineMessageResult) {
  if (!result.prepared || result.debug.memoryDecision === "ask_follow_up") {
    return result.response;
  }
  if (
    result.conversationGoal &&
    (!result.conversationGoal.shouldUseJudgmentPrimary ||
      result.conversationGoal.shouldAvoidStaleJudgment)
  ) {
    return result.response;
  }

  const primary = result.runtime.after.responseEnginePrimary?.trim();
  if (primary) {
    return primary;
  }

  const judgmentPrimary = result.runtime.after.judgment.primary?.trim();
  if (judgmentPrimary && judgmentPrimary !== "Nothing needs your attention right now.") {
    return judgmentPrimary;
  }

  return result.response;
}

export function buildSyncLabMemoryRows(input: {
  storedItems: CapturedSyncItem[];
  testItems: CapturedSyncItem[];
  reference?: Date;
  referenceCounts?: Record<string, number>;
  visibility?: SyncLabMemoryVisibilityMap;
}): SyncLabMemoryRow[] {
  const reference = input.reference ?? new Date();
  const allItems = [
    ...input.testItems.map((item) => ({ item, source: "test" as const })),
    ...input.storedItems.map((item) => ({ item, source: "stored" as const })),
  ].filter(({ item }) => activeItem(item));
  const memoryItems = allItems.map(({ item }) => item);

  return allItems.map(({ item, source }) => ({
    id: item.id,
    title: displayMemoryTitle(item),
    category: item.category,
    importance: item.meaning?.importance ?? effectiveMemoryWeight(item, memoryItems, reference),
    createdDate: dateLabel(item.createdAt),
    updatedDate: dateLabel(item.updatedAt),
    rawInput: item.originalPrompt || item.prompt,
    timesReferenced: input.referenceCounts?.[item.id] ?? 0,
    confidence: confidenceForMemory(item),
    source,
    visibility: source === "stored" ? "visible" : visibilityForMemory(item.id, input.visibility),
    relatedMemoryIds: [],
  }));
}

export function filterSyncLabMemoryRowsByVisibility(
  rows: SyncLabMemoryRow[],
  filter: SyncLabMemoryVisibilityFilter,
): SyncLabMemoryRow[] {
  if (filter === "all") return rows;
  return rows.filter((row) => row.visibility === filter);
}

export function filterSyncLabMemoryRows(
  rows: SyncLabMemoryRow[],
  query: string,
): SyncLabMemoryRow[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;

  return rows.filter((row) =>
    [row.title, row.category, row.importance, row.source].some((value) =>
      value.toLowerCase().includes(normalized),
    ),
  );
}

export function resolveSyncLabMemoryContext(input: {
  contextEnabled?: boolean;
  storedItems: CapturedSyncItem[];
  testItems: CapturedSyncItem[];
}): SyncLabMemoryContext {
  const contextEnabled = input.contextEnabled ?? SYNC_LAB_CONTEXT_DEFAULT;
  const storedMemories = contextEnabled ? input.storedItems : [];
  const labMemories = input.testItems;

  return {
    storedMemories,
    labMemories,
    combinedMemories: [...labMemories, ...storedMemories],
    contextEnabled,
    storedMemoryCount: storedMemories.length,
    labMemoryCount: labMemories.length,
  };
}

function reviewGroupForMemory(
  item: CapturedSyncItem,
  reference = new Date(),
): SyncLabReviewGroupName {
  const profile = buildMemoryProfile(item, reference);
  if (profile.area === "Health") return "Health";
  if (profile.area === "Money") return "Money";
  if (profile.area === "Work") return "Work";
  if (profile.area === "Family") return "Family";
  if (profile.area === "Relationships") return "Relationships";
  if (profile.accumulation === "routine" || profile.type === "habit") {
    return "Routines";
  }
  return "Other";
}

export function buildSyncLabReviewGroups(input: {
  storedItems: CapturedSyncItem[];
  testItems: CapturedSyncItem[];
  visibility?: SyncLabMemoryVisibilityMap;
  limitPerGroup?: number;
}): SyncLabReviewGroup[] {
  const limit = input.limitPerGroup ?? SYNC_LAB_REVIEW_VISIBLE_LIMIT;
  const groups: SyncLabReviewGroup[] = [
    { name: "Health", items: [] },
    { name: "Money", items: [] },
    { name: "Work", items: [] },
    { name: "Family", items: [] },
    { name: "Relationships", items: [] },
    { name: "Routines", items: [] },
    { name: "Other", items: [] },
  ];
  const byName = new Map<SyncLabReviewGroupName, SyncLabReviewGroup>(
    groups.map((group) => [group.name, group]),
  );
  const rows = buildSyncLabMemoryRows({
    storedItems: input.storedItems,
    testItems: input.testItems,
    visibility: input.visibility,
  }).filter((row) => row.visibility === "visible");
  const storedById = new Map(input.storedItems.map((item) => [item.id, item] as const));
  const testById = new Map(input.testItems.map((item) => [item.id, item] as const));

  for (const row of rows) {
    const source = row.source;
    const item =
      source === "stored" ? storedById.get(row.id) : testById.get(row.id);
    if (!item) continue;
    const group =
      byName.get(reviewGroupForMemory(item, new Date())) ?? byName.get("Other");
    if (!group || group.items.length >= limit) continue;
    const confidence = confidenceForMemory(item);
    group?.items.push({
      id: item.id,
      source,
      thinks: item.understanding || displayMemoryTitle(item),
      evidence: [item.originalPrompt || item.prompt].filter(Boolean).slice(0, 2),
      confidence,
      confidenceLabel: confidenceLabel(confidence),
    });
  }

  return groups;
}

export function buildSyncLabBrief(input: {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
}): {
  snapshot: DailyBriefSnapshot;
  preview: SyncLabBriefPreview;
} {
  const snapshot = buildDailyBrief({
    items: input.items,
    workSchedule: input.workSchedule ?? null,
    reference: input.reference ?? new Date(),
  });
  const lines = snapshot.sections.flatMap((section) => section.paragraphs);

  return {
    snapshot,
    preview: {
      lede: snapshot.lede,
      lines,
      isEmpty: snapshot.isEmpty,
    },
  };
}
