import type {
  DashboardTodayRow,
  DashboardUpcomingRow,
} from "@/components/dashboard/dashboard-fallback";
import { toDateKey } from "@/lib/calendar-utils";
import {
  formatItemMeta,
  relativeDayLabel,
  shortDateLabel,
  type TimelineItem,
} from "@/lib/sync-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";

function formatMoneyAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(Math.abs(amount));
}

function eventMeta(event: TimelineEvent) {
  if (event.lifeCategory === "money" && event.amount != null) {
    return formatMoneyAmount(event.amount);
  }
  if (event.durationMinutes != null) {
    return `${event.durationMinutes} min`;
  }
  return event.category;
}

export function syncItemToTodayRow(item: TimelineItem): DashboardTodayRow {
  return {
    id: item.id,
    time: item.time ?? "All day",
    title: item.title,
    category: item.category,
    meta: formatItemMeta(item),
  };
}

export function syncItemToUpcomingRow(
  item: TimelineItem,
  reference = new Date(),
): DashboardUpcomingRow {
  return {
    id: item.id,
    dayLabel: relativeDayLabel(item.date, reference),
    dateLabel: shortDateLabel(item.date),
    title: item.title,
    category: item.category,
    meta: formatItemMeta(item),
  };
}

export function timelineToTodayRow(event: TimelineEvent): DashboardTodayRow {
  return {
    id: event.id,
    time: "All day",
    title: event.title,
    category: event.lifeCategory,
    meta: eventMeta(event),
  };
}

export function timelineToUpcomingRow(
  event: TimelineEvent,
  today: Date,
): DashboardUpcomingRow {
  return {
    id: event.id,
    dayLabel: relativeDayLabel(event.date, today),
    dateLabel: shortDateLabel(event.date),
    title: event.title,
    category: event.lifeCategory,
    meta: eventMeta(event),
  };
}

export const UPCOMING_PREVIEW_DAYS = 3;

export function upcomingFromTimeline(
  events: TimelineEvent[],
  today: Date,
  horizonDays = UPCOMING_PREVIEW_DAYS,
) {
  const todayKey = toDateKey(today);
  const end = new Date(today);
  end.setDate(end.getDate() + horizonDays);
  const endKey = toDateKey(end);

  return events
    .filter((e) => e.date > todayKey && e.date <= endKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => timelineToUpcomingRow(e, today));
}

/** One highlight per day, capped at `dayLimit` (default 3). */
export function takeUpcomingPreview(
  rows: DashboardUpcomingRow[],
  dayLimit = UPCOMING_PREVIEW_DAYS,
) {
  const seen = new Set<string>();
  const preview: DashboardUpcomingRow[] = [];

  for (const row of rows) {
    const dayKey = `${row.dayLabel}-${row.dateLabel}`;
    if (seen.has(dayKey)) continue;
    seen.add(dayKey);
    preview.push(row);
    if (preview.length >= dayLimit) break;
  }

  return preview;
}
