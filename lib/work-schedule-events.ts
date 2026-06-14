import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import { dayCodeToName } from "@/lib/user-timeline-context";
import type { TimelineEvent } from "@/lib/timeline-events";

function formatClock(value: string) {
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${meridiem}`;
}

function formatDuration(startTime: string, endTime: string): number {
  const [startHourText, startMinuteText = "0"] = startTime.split(":");
  const [endHourText, endMinuteText = "0"] = endTime.split(":");
  const start = Number(startHourText) * 60 + Number(startMinuteText);
  let end = Number(endHourText) * 60 + Number(endMinuteText);
  if (end <= start) end += 24 * 60;
  return end - start;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function scheduleDayIndexes(days: string[]): Set<number> {
  const indexes = new Set<number>();
  for (const day of days) {
    const codeIndex = DAY_CODES.indexOf(day.toUpperCase() as (typeof DAY_CODES)[number]);
    if (codeIndex >= 0) {
      indexes.add(codeIndex);
      continue;
    }
    const nameIndex = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ].indexOf(day.toLowerCase());
    if (nameIndex >= 0) indexes.add(nameIndex);
  }
  return indexes;
}

export function generateWorkScheduleEvents(
  schedule: PersistedWorkSchedule,
  viewYear: number,
  viewMonth: number,
): TimelineEvent[] {
  if (schedule.status !== "active") return [];

  const dayIndexes = scheduleDayIndexes(schedule.days);
  if (dayIndexes.size === 0) return [];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startTimeLabel = formatClock(schedule.startTime);
  const endTimeLabel = formatClock(schedule.endTime);
  const durationMinutes = formatDuration(schedule.startTime, schedule.endTime);
  const events: TimelineEvent[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(viewYear, viewMonth, day);
    if (!dayIndexes.has(date.getDay())) continue;

    const dateKey = toDateKey(viewYear, viewMonth, day);
    events.push({
      id: `work-schedule-${dateKey}`,
      title: "Work",
      date: dateKey,
      lifeCategory: "work",
      category: "work schedule",
      source: "schedule",
      status: "saved",
      durationMinutes,
      isAllDay: false,
      detail: {
        time: `${startTimeLabel} – ${endTimeLabel}`,
        durationMinutes,
        note: `Weekly work schedule (${schedule.days.map(dayCodeToName).join(", ")})`,
      },
    });
  }

  return events;
}
