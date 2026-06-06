import { getHealthEventsForMonth } from "@/lib/build-health-calendar-events";
import type { CalendarEvent } from "@/src/data/calendar-events";
import type { HealthEvent } from "@/src/data/health-events";

export type CalendarLens =
  | "all"
  | "money"
  | "health"
  | "career"
  | "relationships"
  | "personal";

export type TimelineEventDetail = {
  time?: string;
  duration?: string;
  durationMinutes?: number;
  amount?: number;
  segment?: string;
  note?: string;
  remaining?: number;
};

export type TimelineEvent = {
  id: string;
  title: string;
  date: string;
  lifeCategory: Exclude<CalendarLens, "all">;
  category: string;
  source: string;
  status?: string;
  amount?: number;
  durationMinutes?: number;
  detail?: TimelineEventDetail;
};

export function moneyEventToTimeline(event: CalendarEvent): TimelineEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    lifeCategory: "money",
    category: event.category,
    source: event.source,
    amount: event.amount,
  };
}

export function healthEventToTimeline(event: HealthEvent): TimelineEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    lifeCategory: "health",
    category: event.category,
    source: event.source,
    durationMinutes: event.durationMinutes,
  };
}

export function getHealthTimelineForMonth(year: number, month: number) {
  return getHealthEventsForMonth(year, month).map(healthEventToTimeline);
}

export function mergeTimelineForMonth(
  moneyEvents: CalendarEvent[],
  year: number,
  month: number,
): TimelineEvent[] {
  const money = moneyEvents.map(moneyEventToTimeline);
  const health = getHealthTimelineForMonth(year, month);
  return [...money, ...health].sort((a, b) => a.date.localeCompare(b.date));
}

export function filterTimelineByLens(
  events: TimelineEvent[],
  lens: CalendarLens,
): TimelineEvent[] {
  if (lens === "all") return events;
  if (
    lens === "career" ||
    lens === "relationships" ||
    lens === "personal"
  ) {
    return [];
  }
  return events.filter((e) => e.lifeCategory === lens);
}

export function groupTimelineByDate(events: TimelineEvent[]) {
  const map = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  return map;
}
