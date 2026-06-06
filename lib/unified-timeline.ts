import { mergeWithSyncTimeline } from "@/lib/sync-timeline";
import {
  mergeTimelineForMonth,
  type TimelineEvent,
} from "@/lib/timeline-events";
import type { CalendarEvent } from "@/src/data/calendar-events";

type BuildUnifiedTimelineOptions = {
  reference?: Date;
  /** When true (default), fill sparse months with sync-timeline fallbacks. */
  fillGaps?: boolean;
};

/** Single client-side merge: money calendar + health file data + sync fallbacks. */
export function buildUnifiedTimeline(
  moneyEvents: CalendarEvent[],
  year: number,
  month: number,
  options: BuildUnifiedTimelineOptions = {},
): TimelineEvent[] {
  const { reference = new Date(), fillGaps = true } = options;
  const base = mergeTimelineForMonth(moneyEvents, year, month);
  if (!fillGaps) return base;
  return mergeWithSyncTimeline(base, year, month, reference);
}

export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}
