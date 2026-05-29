import type { CalendarEventSource } from "@/src/data/calendar-events";

export const CALENDAR_WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const calendarSourceLabels: Record<CalendarEventSource, string> = {
  recurring: "Recurring",
  transaction: "Logged",
  scheduled: "Scheduled",
};
