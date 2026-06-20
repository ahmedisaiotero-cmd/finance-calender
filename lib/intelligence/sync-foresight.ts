import { toDateKey } from "@/lib/calendar-utils";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import type { SyncTimeBlock } from "@/lib/sync-time-blocks";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

function daysUntilDateKey(dateKey: string | null, reference: Date) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export type ForesightHorizon =
  | "today"
  | "tomorrow"
  | "next_3_days"
  | "this_week"
  | "later";

export type ForesightBucket = {
  horizon: ForesightHorizon;
  label: string;
  consequences: SyncConsequence[];
  memoryIds: string[];
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function activeItem(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

export function horizonForDays(days: number | null): ForesightHorizon {
  if (days == null || days < 0) return "later";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 3) return "next_3_days";
  if (days <= 7) return "this_week";
  return "later";
}

const HORIZON_LABELS: Record<ForesightHorizon, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  next_3_days: "Next few days",
  this_week: "This week",
  later: "Later",
};

export function buildForesightBuckets(options: {
  consequences: SyncConsequence[];
  items: CapturedSyncItem[];
  blocks?: SyncTimeBlock[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
}): ForesightBucket[] {
  const reference = options.reference ?? new Date();
  const consequenceBuckets = new Map<ForesightHorizon, SyncConsequence[]>();

  for (const consequence of options.consequences) {
    if (!consequence.briefEligible || consequence.kind === "ambient") continue;
    const horizon = horizonForDays(consequence.daysUntil);
    const list = consequenceBuckets.get(horizon) ?? [];
    list.push(consequence);
    consequenceBuckets.set(horizon, list);
  }

  const memoryBuckets = new Map<ForesightHorizon, string[]>();
  for (const item of options.items.filter(activeItem)) {
    const key = resolveCaptureDateKey(item, reference);
    const days = daysUntilDateKey(key, reference);
    const horizon = horizonForDays(days);
    const list = memoryBuckets.get(horizon) ?? [];
    list.push(item.id);
    memoryBuckets.set(horizon, list);
  }

  const order: ForesightHorizon[] = [
    "today",
    "tomorrow",
    "next_3_days",
    "this_week",
    "later",
  ];

  return order
    .map((horizon) => ({
      horizon,
      label: HORIZON_LABELS[horizon],
      consequences: (consequenceBuckets.get(horizon) ?? []).sort(
        (a, b) => (a.priority ?? 99) - (b.priority ?? 99),
      ),
      memoryIds: memoryBuckets.get(horizon) ?? [],
    }))
    .filter(
      (bucket) => bucket.consequences.length > 0 || bucket.memoryIds.length > 0,
    );
}

export function headlineHorizon(
  consequences: SyncConsequence[],
  reference = new Date(),
): ForesightHorizon {
  const headline = consequences
    .filter((c) => c.horizon === "headline" && c.briefEligible)
    .sort((a, b) => a.priority - b.priority)[0];

  if (!headline) return "today";
  return horizonForDays(headline.daysUntil);
}

export function tomorrowDateKey(reference = new Date()) {
  return toDateKey(addDays(reference, 1));
}
