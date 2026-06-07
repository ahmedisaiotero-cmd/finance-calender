import { parseDateKey, toDateKey } from "@/lib/calendar-utils";
import { getItemsForDate, itemToTimelineEvent } from "@/lib/sync-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";

export const BUSY_DAY_EVENT_THRESHOLD = 4;
export const LIGHT_DAY_EVENT_THRESHOLD = 1;
export const FORECAST_WINDOW_DAYS = 3;

export function shiftDateKey(dateKey: string, dayDelta: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + dayDelta);
  return toDateKey(date);
}

/** Grid-visible event count for a single date (calendar indicators use this). */
export function countEventsOnDate(
  dateKey: string,
  timelineByDate: Map<string, TimelineEvent[]>,
): number {
  return timelineByDate.get(dateKey)?.length ?? 0;
}

export function isBusyEventCount(count: number): boolean {
  return count >= BUSY_DAY_EVENT_THRESHOLD;
}

export function isLightEventCount(count: number): boolean {
  return count <= LIGHT_DAY_EVENT_THRESHOLD;
}

/** Selected-day panel + Pulse selectedDayEventCount (original logic). */
export function resolveSelectedDayEvents(
  dateKey: string,
  timelineByDate: Map<string, TimelineEvent[]>,
  usingLiveTimeline: boolean,
  reference: Date,
): TimelineEvent[] {
  const live = timelineByDate.get(dateKey) ?? [];
  if (live.length > 0 || usingLiveTimeline) return live;
  return getItemsForDate(dateKey, reference).map(itemToTimelineEvent);
}

/** Pulse next-day forecast — grid-visible timeline only, no mock fallback. */
export function countNextDayEventsForPulse(
  selectedDateKey: string,
  timelineByDate: Map<string, TimelineEvent[]>,
): number {
  return countEventsOnDate(
    shiftDateKey(selectedDateKey, 1),
    timelineByDate,
  );
}

/** True when at least two of the next N days are busy on the grid timeline. */
export function isUpcomingWindowBusy(
  anchorDateKey: string,
  timelineByDate: Map<string, TimelineEvent[]>,
  windowDays = FORECAST_WINDOW_DAYS,
): boolean {
  let busyDays = 0;

  for (let offset = 1; offset <= windowDays; offset++) {
    const count = countEventsOnDate(
      shiftDateKey(anchorDateKey, offset),
      timelineByDate,
    );
    if (isBusyEventCount(count)) {
      busyDays += 1;
    }
  }

  return busyDays >= 2;
}

/** Money event on any of the next N days after the anchor (grid timeline). */
export function hasMoneyEventInNextDays(
  anchorDateKey: string,
  timelineByDate: Map<string, TimelineEvent[]>,
  withinDays = FORECAST_WINDOW_DAYS,
): boolean {
  for (let offset = 1; offset <= withinDays; offset++) {
    const events =
      timelineByDate.get(shiftDateKey(anchorDateKey, offset)) ?? [];
    if (events.some((event) => event.lifeCategory === "money")) {
      return true;
    }
  }
  return false;
}

export type CalendarPulseForecast = {
  selectedDayEventCount: number;
  nextDayEventCount: number;
  nextThreeDaysBusy: boolean;
  hasMoneyEventSoon: boolean;
  hasHealthEventOnSelectedDay: boolean;
  isToday: boolean;
};

/** Assemble Pulse-only forecast inputs from grid timeline + selected-day resolution. */
export function buildCalendarPulseForecast(
  selectedDateKey: string,
  todayKey: string,
  timelineByDate: Map<string, TimelineEvent[]>,
  selectedEvents: TimelineEvent[],
): CalendarPulseForecast {
  const nextDayEventCount = countNextDayEventsForPulse(
    selectedDateKey,
    timelineByDate,
  );

  return {
    selectedDayEventCount: selectedEvents.length,
    nextDayEventCount,
    nextThreeDaysBusy: isUpcomingWindowBusy(selectedDateKey, timelineByDate),
    hasMoneyEventSoon: hasMoneyEventInNextDays(
      selectedDateKey,
      timelineByDate,
    ),
    hasHealthEventOnSelectedDay: selectedEvents.some(
      (event) => event.lifeCategory === "health",
    ),
    isToday: selectedDateKey === todayKey,
  };
}
