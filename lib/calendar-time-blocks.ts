import type { CapturedSyncItem } from "@/lib/captured-items";
import type { PulsePlan } from "@/lib/pulse/types";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import {
  buildCalendarMonthView as buildMonthView,
  buildSyncTimeBlocksForMonth,
  captureItemToSyncTimeBlock,
  detectSyncTimeBlockOverlaps,
  proposedSyncTimeBlocksFromPlan,
  syncTimeBlocksOverlap,
  type SyncTimeBlock,
  type SyncTimeBlockOverlap,
} from "@/lib/sync-time-blocks";

/** @deprecated Use SyncTimeBlock */
export type CalendarTimeBlockSource = "capture" | "schedule";

/** @deprecated Use SyncTimeBlock */
export type CalendarTimeBlock = {
  id: string;
  date: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  source: CalendarTimeBlockSource;
  isAllDay: boolean;
  captureId?: string;
  lifeCategory?: string;
};

export type CalendarOverlapWarning = SyncTimeBlockOverlap & {
  date: string;
  conflictingTitle: string;
  message: string;
};

function clockToMinutes(value?: string | null) {
  if (!value) return null;
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function minutesToClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toLegacyBlock(block: SyncTimeBlock): CalendarTimeBlock {
  const startMinutes = clockToMinutes(block.startTime) ?? 0;
  const endMinutes =
    clockToMinutes(block.endTime) ??
    (block.isTimed ? startMinutes + 60 : 24 * 60);

  return {
    id: block.id,
    date: block.date,
    title: block.title,
    startMinutes,
    endMinutes: endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes,
    source: block.blockType === "schedule" ? "schedule" : "capture",
    isAllDay: !block.isTimed,
    captureId:
      block.sourceItemId === "work-schedule" ||
      block.sourceItemId.startsWith("block-schedule")
        ? undefined
        : block.sourceItemId,
    lifeCategory: block.area,
  };
}

function toSyncBlock(block: CalendarTimeBlock): SyncTimeBlock {
  return {
    id: block.id,
    sourceItemId: block.captureId ?? "legacy",
    title: block.title,
    area: "calendar",
    date: block.date,
    startTime: minutesToClock(block.startMinutes),
    endTime: minutesToClock(block.endMinutes),
    isTimed: !block.isAllDay,
    blockType: block.source === "schedule" ? "schedule" : "event",
    destinations: ["Calendar"],
  };
}

export function captureItemToTimeBlock(
  item: CapturedSyncItem,
  reference?: Date,
) {
  const block = captureItemToSyncTimeBlock(item, reference);
  return block ? toLegacyBlock(block) : null;
}

export function workScheduleToTimeBlocksForMonth(
  schedule: PersistedWorkSchedule,
  year: number,
  month: number,
) {
  return buildSyncTimeBlocksForMonth({
    items: [],
    year,
    month,
    workSchedule: schedule,
  }).map(toLegacyBlock);
}

export function buildCalendarTimeBlocksForMonth(
  options: Parameters<typeof buildSyncTimeBlocksForMonth>[0],
) {
  return buildSyncTimeBlocksForMonth(options).map(toLegacyBlock);
}

export function timeBlocksOverlap(
  left: CalendarTimeBlock,
  right: CalendarTimeBlock,
) {
  return syncTimeBlocksOverlap(toSyncBlock(left), toSyncBlock(right));
}

export function findOverlappingTimeBlocks(
  proposed: CalendarTimeBlock,
  existing: CalendarTimeBlock[],
) {
  return existing.filter((block) => timeBlocksOverlap(proposed, block));
}

export function proposedTimeBlocksFromPlan(plan: PulsePlan, reference?: Date) {
  return proposedSyncTimeBlocksFromPlan(plan, reference).map(toLegacyBlock);
}

export function detectCalendarOverlapWarnings(options: {
  plan: PulsePlan;
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  excludeCaptureId?: string;
}): CalendarOverlapWarning[] {
  return detectSyncTimeBlockOverlaps(options).map((overlap) => ({
    ...overlap,
    date: options.plan.timeline?.startDate ?? "",
    conflictingTitle: overlap.existingTitle,
    message: overlap.headline,
  }));
}

export function formatOverlapPreviewMessage(
  warnings: CalendarOverlapWarning[],
): string | undefined {
  if (warnings.length === 0) return undefined;
  return warnings[0].headline;
}

export function buildCalendarMonthView(
  options: Parameters<typeof buildMonthView>[0],
) {
  return buildMonthView(options);
}
