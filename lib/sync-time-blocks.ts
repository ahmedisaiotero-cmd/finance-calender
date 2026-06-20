import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import { groupEventsByDate, toDateKey } from "@/lib/calendar-utils";
import type { PulsePlan } from "@/lib/pulse/types";
import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { dayCodeToName, normalizeScheduleDays } from "@/lib/user-timeline-context";
import { collectWorkDayOffDateKeys } from "@/lib/sync-capture/work-availability";

export type SyncTimeBlockArea =
  | "calendar"
  | "work"
  | "health"
  | "finance"
  | "relationships"
  | "goals"
  | "school"
  | "family";

export type SyncTimeBlockType =
  | "event"
  | "schedule"
  | "deadline"
  | "log"
  | "task";

export type SyncTimeBlock = {
  id: string;
  sourceItemId: string;
  title: string;
  area: SyncTimeBlockArea;
  date: string;
  startTime?: string;
  endTime?: string;
  isTimed: boolean;
  blockType: SyncTimeBlockType;
  destinations: string[];
  protected?: boolean;
};

export type SyncTimeBlockOverlap = {
  headline: string;
  existingTitle: string;
  existingRange: string;
  proposedTitle: string;
  proposedRange: string;
  dateLabel: string;
  severity?: "notice" | "important";
  conflictMeaning?: string;
  existingProtected?: boolean;
  existingArea?: SyncTimeBlockArea;
  conflictSourceItemId?: string;
};

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function activeCapture(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

function clockToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

export function formatSyncClock(value?: string) {
  if (!value) return undefined;
  const minutes = clockToMinutes(value);
  if (minutes == null) return value;
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

export function formatSyncTimeBlockRange(block: SyncTimeBlock) {
  if (!block.isTimed || !block.startTime) return "All day";
  const start = formatSyncClock(block.startTime);
  const end = block.endTime ? formatSyncClock(block.endTime) : undefined;
  return end ? `${start}–${end}` : start;
}

export function formatSyncTimeBlockCellLabel(block: SyncTimeBlock) {
  if (!block.isTimed || !block.startTime) return block.title;
  return `${formatSyncClock(block.startTime)} ${block.title}`;
}

function resolveBlockArea(item: CapturedSyncItem): SyncTimeBlockArea {
  if (
    item.destinations.includes("Work") ||
    item.category === "work-schedule" ||
    item.category === "workday"
  ) {
    return "work";
  }
  if (item.destinations.includes("Health") || item.category === "workout") {
    return "health";
  }
  if (item.destinations.includes("Finance")) return "finance";
  if (
    item.destinations.includes("Relationships") ||
    item.category === "date-night"
  ) {
    return "relationships";
  }
  if (item.destinations.includes("Goals") || item.category === "savings-goal") {
    return "goals";
  }
  if (item.destinations.includes("School")) return "school";
  if (item.destinations.includes("Family")) return "family";
  return "calendar";
}

function resolveBlockType(
  timeline?: TimelineResolution,
): SyncTimeBlockType {
  const role = timeline?.timelineRole;
  if (role === "schedule") return "schedule";
  if (role === "deadline") return "deadline";
  if (role === "log") return "log";
  if (role === "task") return "task";
  return "event";
}

function dateKeyInMonth(dateKey: string, year: number, month: number) {
  const [y, m] = dateKey.split("-").map(Number);
  return y === year && m === month + 1;
}

function monthDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function scheduleDayIndexes(days: string[]) {
  const indexes = new Set<number>();
  for (const day of normalizeScheduleDays(days)) {
    const codeIndex = DAY_CODES.indexOf(day.toUpperCase() as (typeof DAY_CODES)[number]);
    if (codeIndex >= 0) indexes.add(codeIndex);
  }
  return indexes;
}

function friendlyDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function compareBlocks(a: SyncTimeBlock, b: SyncTimeBlock) {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;
  const aStart = clockToMinutes(a.startTime) ?? 0;
  const bStart = clockToMinutes(b.startTime) ?? 0;
  return aStart - bStart;
}

export function captureItemToSyncTimeBlock(
  item: CapturedSyncItem,
  reference = new Date(),
): SyncTimeBlock | null {
  if (!activeCapture(item) || !item.destinations.includes("Calendar")) {
    return null;
  }

  const date = resolveCaptureDateKey(item, reference);
  if (!date) return null;

  const timeline = item.timeline;
  const startTime =
    timeline?.timelineRole === "deadline"
      ? timeline.deadlineTime
      : timeline?.startTime;
  const endTime = timeline?.endTime;
  const isTimed = Boolean(timeline?.isTimed && startTime);
  const durationMinutes = timeline?.durationMinutes;

  let resolvedEnd = endTime;
  if (isTimed && startTime && !resolvedEnd) {
    const startMinutes = clockToMinutes(startTime);
    if (startMinutes != null) {
      const duration =
        durationMinutes && durationMinutes > 0 ? durationMinutes : 60;
      const endMinutes = startMinutes + duration;
      resolvedEnd = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    }
  }

  return {
    id: `block-capture-${item.id}`,
    sourceItemId: item.id,
    title: item.title,
    area: resolveBlockArea(item),
    date,
    startTime: isTimed ? startTime : undefined,
    endTime: isTimed ? resolvedEnd : undefined,
    isTimed,
    blockType: resolveBlockType(timeline),
    destinations: [...item.destinations],
    protected: item.protectedTime?.enabled === true,
  };
}

export function workScheduleToSyncTimeBlocksForMonth(
  schedule: PersistedWorkSchedule,
  year: number,
  month: number,
  options?: { suppressDates?: Set<string> },
): SyncTimeBlock[] {
  if (schedule.status !== "active") return [];

  const dayIndexes = scheduleDayIndexes(schedule.days);
  if (dayIndexes.size === 0) return [];

  const blocks: SyncTimeBlock[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const sourceItemId = schedule.sourceItemId ?? "work-schedule";
  const suppressDates = options?.suppressDates;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    if (!dayIndexes.has(date.getDay())) continue;

    const dateKey = monthDateKey(year, month, day);
    if (suppressDates?.has(dateKey)) continue;

    blocks.push({
      id: `block-schedule-${dateKey}`,
      sourceItemId,
      title: "Work",
      area: "work",
      date: dateKey,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isTimed: true,
      blockType: "schedule",
      destinations: ["Work", "Calendar"],
    });
  }

  return blocks;
}

export function buildSyncTimeBlocksForMonth(options: {
  items: CapturedSyncItem[];
  year: number;
  month: number;
  reference?: Date;
  workSchedule?: PersistedWorkSchedule | null;
  excludeCaptureId?: string;
}): SyncTimeBlock[] {
  const reference = options.reference ?? new Date();
  const activeItems = options.items.filter(
    (item) => item.id !== options.excludeCaptureId,
  );
  const dayOffDates = collectWorkDayOffDateKeys(activeItems, reference);

  const captureBlocks = activeItems
    .map((item) => captureItemToSyncTimeBlock(item, reference))
    .filter((block): block is SyncTimeBlock => block !== null)
    .filter((block) => dateKeyInMonth(block.date, options.year, options.month));

  const scheduleBlocks = options.workSchedule
    ? workScheduleToSyncTimeBlocksForMonth(
        options.workSchedule,
        options.year,
        options.month,
        { suppressDates: dayOffDates },
      )
    : [];

  return [...captureBlocks, ...scheduleBlocks].sort(compareBlocks);
}

export function buildSyncTimeBlocksForRange(options: {
  items: CapturedSyncItem[];
  startDate: Date;
  endDate: Date;
  reference?: Date;
  workSchedule?: PersistedWorkSchedule | null;
  excludeCaptureId?: string;
}): SyncTimeBlock[] {
  const reference = options.reference ?? new Date();
  const months = new Map<string, { year: number; month: number }>();
  const cursor = new Date(options.startDate);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(options.endDate);
  end.setHours(12, 0, 0, 0);

  while (cursor <= end) {
    months.set(`${cursor.getFullYear()}-${cursor.getMonth()}`, {
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }

  const blocks: SyncTimeBlock[] = [];
  for (const { year, month } of months.values()) {
    blocks.push(
      ...buildSyncTimeBlocksForMonth({
        items: options.items,
        year,
        month,
        reference,
        workSchedule: options.workSchedule,
        excludeCaptureId: options.excludeCaptureId,
      }),
    );
  }

  const startKey = toDateKey(options.startDate);
  const endKey = toDateKey(options.endDate);
  return blocks
    .filter((block) => block.date >= startKey && block.date <= endKey)
    .sort(compareBlocks);
}

export function filterSyncTimeBlocksByArea(
  blocks: SyncTimeBlock[],
  area: SyncTimeBlockArea,
) {
  return blocks.filter((block) => block.area === area);
}

export function syncTimeBlocksOverlap(
  left: SyncTimeBlock,
  right: SyncTimeBlock,
): boolean {
  if (left.date !== right.date) return false;
  if (!left.isTimed || !right.isTimed || !left.startTime || !right.startTime) {
    return false;
  }

  const leftStart = clockToMinutes(left.startTime);
  const leftEnd =
    clockToMinutes(left.endTime) ??
    (leftStart != null ? leftStart + 60 : null);
  const rightStart = clockToMinutes(right.startTime);
  const rightEnd =
    clockToMinutes(right.endTime) ??
    (rightStart != null ? rightStart + 60 : null);

  if (
    leftStart == null ||
    leftEnd == null ||
    rightStart == null ||
    rightEnd == null
  ) {
    return false;
  }

  const normalizedLeftEnd = leftEnd <= leftStart ? leftEnd + 24 * 60 : leftEnd;
  const normalizedRightEnd =
    rightEnd <= rightStart ? rightEnd + 24 * 60 : rightEnd;

  return (
    leftStart < normalizedRightEnd && rightStart < normalizedLeftEnd
  );
}

function expandRecurringDates(
  days: string[],
  reference: Date,
  horizonDays = 28,
): string[] {
  const normalizedDays = normalizeScheduleDays(days);
  const dayIndexes = new Set(
    normalizedDays
      .map((day) =>
        DAY_CODES.indexOf(day.toUpperCase() as (typeof DAY_CODES)[number]),
      )
      .filter((index) => index >= 0),
  );

  const dates: string[] = [];
  const cursor = new Date(reference);
  cursor.setHours(12, 0, 0, 0);

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + offset);
    if (!dayIndexes.has(date.getDay())) continue;
    dates.push(toDateKey(date));
  }

  return [...new Set(dates)];
}

function resolvePlanDate(plan: PulsePlan): string | null {
  const timeline = plan.timeline;
  if (!timeline) return null;
  if (timeline.timelineRole === "deadline") {
    return timeline.deadlineDate ?? timeline.startDate ?? null;
  }
  return timeline.startDate ?? null;
}

export function proposedSyncTimeBlocksFromPlan(
  plan: PulsePlan,
  reference = new Date(),
): SyncTimeBlock[] {
  const timeline = plan.timeline;
  if (!timeline) return [];

  const startTime =
    timeline.timelineRole === "deadline"
      ? timeline.deadlineTime
      : timeline.startTime;
  const endTime = timeline.endTime;
  const isTimed = Boolean(timeline.isTimed && startTime);
  const durationMinutes = timeline.durationMinutes;

  let resolvedEnd = endTime;
  if (isTimed && startTime && !resolvedEnd) {
    const startMinutes = clockToMinutes(startTime);
    if (startMinutes != null) {
      const duration =
        durationMinutes && durationMinutes > 0 ? durationMinutes : 60;
      const endMinutes = startMinutes + duration;
      resolvedEnd = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    }
  }

  const destinations = plan.category === "work-schedule"
    ? ["Work", "Calendar"]
    : ["Calendar"];

  if (timeline.kind === "recurring" && timeline.recurrence?.days?.length) {
    if (!isTimed || !startTime) return [];

    return expandRecurringDates(timeline.recurrence.days, reference).map(
      (date) => ({
        id: `block-proposed-${plan.id}-${date}`,
        sourceItemId: plan.id,
        title: plan.title,
        area: "work",
        date,
        startTime,
        endTime: resolvedEnd,
        isTimed: true,
        blockType: "schedule",
        destinations,
      }),
    );
  }

  const date = resolvePlanDate(plan);
  if (!date) return [];

  return [
    {
      id: `block-proposed-${plan.id}`,
      sourceItemId: plan.id,
      title: plan.title,
      area:
        plan.category === "workout"
          ? "health"
          : plan.category === "date-night"
            ? "relationships"
            : plan.category === "workday" || plan.category === "work-schedule"
              ? "work"
              : "calendar",
      date,
      startTime: isTimed ? startTime : undefined,
      endTime: isTimed ? resolvedEnd : undefined,
      isTimed,
      blockType: resolveBlockType(timeline),
      destinations,
    },
  ];
}

export function detectSyncTimeBlockOverlaps(options: {
  plan: PulsePlan;
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  excludeCaptureId?: string;
}): SyncTimeBlockOverlap[] {
  const reference = options.reference ?? new Date();
  const proposed = proposedSyncTimeBlocksFromPlan(options.plan, reference).filter(
    (block) => block.isTimed,
  );
  if (proposed.length === 0) return [];

  const months = new Map<string, { year: number; month: number }>();
  for (const block of proposed) {
    const [year, month] = block.date.split("-").map(Number);
    months.set(`${year}-${month}`, { year, month: month - 1 });
  }

  const existing: SyncTimeBlock[] = [];
  for (const { year, month } of months.values()) {
    existing.push(
      ...buildSyncTimeBlocksForMonth({
        items: options.items,
        year,
        month,
        reference,
        workSchedule: options.workSchedule,
        excludeCaptureId: options.excludeCaptureId,
      }).filter((block) => block.isTimed),
    );
  }

  const overlaps: SyncTimeBlockOverlap[] = [];
  const seen = new Set<string>();

  for (const block of proposed) {
    for (const conflict of existing) {
      if (!syncTimeBlocksOverlap(block, conflict)) continue;
      const key = `${block.date}:${conflict.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      overlaps.push({
        headline: `This overlaps with ${conflict.title}.`,
        existingTitle: conflict.title,
        existingRange: formatSyncTimeBlockRange(conflict),
        proposedTitle: block.title,
        proposedRange: formatSyncTimeBlockRange(block),
        dateLabel: friendlyDateLabel(block.date),
        severity: conflict.protected ? "important" : "notice",
        existingProtected: conflict.protected,
        existingArea: conflict.area,
        conflictSourceItemId: conflict.sourceItemId,
      });
    }
  }

  return overlaps;
}

function syncTimeBlockToTimelineEvent(block: SyncTimeBlock): TimelineEvent {
  const lifeCategoryMap: Record<
    SyncTimeBlockArea,
    TimelineEvent["lifeCategory"]
  > = {
    calendar: "personal",
    work: "work",
    health: "health",
    finance: "money",
    relationships: "relationships",
    goals: "goals",
    school: "personal",
    family: "personal",
  };

  const range = formatSyncTimeBlockRange(block);
  const [startLabel, endLabel] = range.includes("–")
    ? range.split("–")
    : [range, undefined];

  return {
    id: block.id,
    title: block.title,
    date: block.date,
    lifeCategory: lifeCategoryMap[block.area],
    category: block.blockType,
    source: block.blockType === "schedule" ? "schedule" : "capture",
    status: "saved",
    captureId: block.sourceItemId.startsWith("work-schedule")
      ? undefined
      : block.sourceItemId,
    isAllDay: !block.isTimed,
    durationMinutes:
      block.isTimed && block.startTime && block.endTime
        ? (clockToMinutes(block.endTime) ?? 0) -
          (clockToMinutes(block.startTime) ?? 0)
        : undefined,
    detail: {
      time:
        block.isTimed && endLabel
          ? `${startLabel?.trim()} – ${endLabel.trim()}`
          : startLabel,
      durationMinutes:
        block.isTimed && block.startTime && block.endTime
          ? (clockToMinutes(block.endTime) ?? 0) -
            (clockToMinutes(block.startTime) ?? 0)
          : undefined,
      note:
        block.blockType === "schedule"
          ? `Weekly work schedule`
          : undefined,
    },
  };
}

export function buildCalendarMonthView(options: {
  items: CapturedSyncItem[];
  year: number;
  month: number;
  reference?: Date;
  workSchedule?: PersistedWorkSchedule | null;
}): {
  blocks: SyncTimeBlock[];
  eventsByDate: Map<string, TimelineEvent[]>;
} {
  const blocks = buildSyncTimeBlocksForMonth(options);
  const events = blocks.map(syncTimeBlockToTimelineEvent);
  const eventsByDate = groupEventsByDate(events);

  for (const [date, dayEvents] of eventsByDate) {
    const order = blocks
      .filter((block) => block.date === date)
      .map((block) => block.id);
    dayEvents.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    eventsByDate.set(date, dayEvents);
  }

  return { blocks, eventsByDate };
}

export function formatWorkScheduleDaysLabel(days: string[]) {
  const names = normalizeScheduleDays(days).map(dayCodeToName);
  if (names.length === 0) return "Weekly";
  if (names.length === 1) return `Every ${names[0]}`;
  if (names.length === 2) return `Every ${names[0]} and ${names[1]}`;
  return `Every ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function groupSyncTimeBlocksByDate(blocks: SyncTimeBlock[]) {
  const map = new Map<string, SyncTimeBlock[]>();
  for (const block of blocks) {
    const list = map.get(block.date) ?? [];
    list.push(block);
    map.set(block.date, list);
  }
  for (const [date, dayBlocks] of map) {
    map.set(date, [...dayBlocks].sort(compareBlocks));
  }
  return map;
}
