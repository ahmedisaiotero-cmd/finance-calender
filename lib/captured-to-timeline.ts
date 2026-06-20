import { toDateKey } from "@/lib/calendar-utils";
import {
  resolveNextOccurrenceDateKey,
} from "@/lib/timeline/next-occurrence";
import type { CapturedSyncItem } from "@/lib/captured-items";
import type { PulsePlanCategory } from "@/lib/pulse/types";
import type { TimelineEvent } from "@/lib/timeline-events";

function formatClock(value?: string) {
  if (!value) return undefined;
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${meridiem}`;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

export function isRelationshipCapture(item: CapturedSyncItem): boolean {
  return (
    item.destinations.includes("Relationships") ||
    item.category === "date-night" ||
    /\b(mom|dad|mother|father|parent|grandma|grandpa|family|friend|partner|wife|husband|girlfriend|boyfriend|anniversary|birthday|call|dinner with)\b/i.test(
      item.prompt,
    )
  );
}

export function captureLifeCategory(
  item: CapturedSyncItem,
): TimelineEvent["lifeCategory"] {
  if (isRelationshipCapture(item)) return "relationships";
  if (item.destinations.includes("Health") || item.category === "workout") {
    return "health";
  }
  if (
    item.destinations.includes("Finance") ||
    item.category === "expense" ||
    item.category === "subscription"
  ) {
    return "money";
  }
  if (item.destinations.includes("Work") || item.category === "workday" || item.category === "work-schedule") {
    return "work";
  }
  if (item.destinations.includes("Goals") || item.category === "savings-goal") {
    return "goals";
  }
  return "personal";
}

export function resolveCaptureDateKey(
  item: CapturedSyncItem,
  reference = new Date(),
): string | null {
  const timeline = item.timeline;
  if (!timeline) return null;

  if (timeline.recurrence) {
    const next = resolveNextOccurrenceDateKey(timeline, reference);
    if (next) return next;
  }

  if (timeline.timelineRole === "deadline") {
    return timeline.deadlineDate ?? timeline.startDate ?? null;
  }

  if (timeline.startDate) {
    if (timeline.recurrence?.frequency === "yearly" || /\bbirthday\b/i.test(item.prompt)) {
      const next = resolveNextOccurrenceDateKey(timeline, reference);
      if (next) return next;
    }
    return timeline.startDate;
  }

  const label = (timeline.label ?? item.dateLabel).toLowerCase();
  if (label === "today") return toDateKey(reference);
  if (label === "tomorrow") {
    const next = new Date(reference);
    next.setDate(next.getDate() + 1);
    return toDateKey(next);
  }

  return null;
}

function parseAmount(amount?: string | null): number | undefined {
  if (!amount) return undefined;
  const match = amount.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  return Number(match[0]);
}

function categoryLabel(category: PulsePlanCategory): string {
  return category.replace(/-/g, " ");
}

export function capturedItemToTimelineEvent(
  item: CapturedSyncItem,
  reference = new Date(),
): TimelineEvent | null {
  if (item.status === "cancelled" || item.deletedAt) return null;
  if (!item.destinations.includes("Calendar")) return null;

  const date = resolveCaptureDateKey(item, reference);
  if (!date) return null;

  const timeline = item.timeline;
  const isTimed = Boolean(timeline?.isTimed && timeline.startTime);
  const startTime = formatClock(
    timeline?.timelineRole === "deadline"
      ? timeline.deadlineTime
      : timeline?.startTime,
  );
  const endTime = formatClock(timeline?.endTime);
  const timeLabel =
    startTime && endTime
      ? `${startTime} – ${endTime}`
      : startTime ?? (item.timeLabel !== "Flexible" ? item.timeLabel : undefined);

  return {
    id: `capture-${item.id}`,
    title: item.title,
    date,
    lifeCategory: captureLifeCategory(item),
    category: categoryLabel(item.category),
    source: "capture",
    status: item.status,
    amount: parseAmount(item.amount),
    durationMinutes: timeline?.durationMinutes,
    captureId: item.id,
    isAllDay: !isTimed,
    detail: {
      time: timeLabel,
      duration: timeline?.durationMinutes
        ? formatDuration(timeline.durationMinutes)
        : undefined,
      durationMinutes: timeline?.durationMinutes,
      note: item.notes ?? item.prompt,
    },
  };
}

export function capturedItemsToTimelineEvents(
  items: CapturedSyncItem[],
  reference = new Date(),
): TimelineEvent[] {
  return items
    .map((item) => capturedItemToTimelineEvent(item, reference))
    .filter((event): event is TimelineEvent => event !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function filterCapturesForDate(
  items: CapturedSyncItem[],
  dateKey: string,
  reference = new Date(),
): CapturedSyncItem[] {
  return items.filter((item) => resolveCaptureDateKey(item, reference) === dateKey);
}
