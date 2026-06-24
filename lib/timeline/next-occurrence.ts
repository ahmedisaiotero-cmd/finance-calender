import { toDateKey } from "@/lib/calendar-utils";
import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayIndexFromName(day: string) {
  return DAY_NAMES.findIndex(
    (name) => name.toLowerCase() === day.toLowerCase(),
  );
}

export function formatRecurrenceLabel(
  timeline?: TimelineResolution | null,
): string | null {
  const recurrence = timeline?.recurrence;
  if (!recurrence) return null;

  if (recurrence.frequency === "yearly") {
    return "Every year";
  }

  if (recurrence.frequency === "biweekly" && recurrence.days?.[0]) {
    return `Every other ${recurrence.days[0]}`;
  }

  if (recurrence.frequency === "weekly" && recurrence.days?.[0]) {
    return `Every ${recurrence.days[0]}`;
  }

  if (recurrence.frequency === "monthly" && recurrence.dayOfMonth) {
    return `Every month on the ${recurrence.dayOfMonth}`;
  }

  return null;
}

export function resolveNextOccurrenceDateKey(
  timeline: TimelineResolution,
  reference = new Date(),
): string | null {
  const ref = startOfDay(reference);
  const recurrence = timeline.recurrence;

  if (recurrence?.frequency === "yearly") {
    const month = recurrence.month;
    const dayOfMonth = recurrence.dayOfMonth;
    if (month == null || dayOfMonth == null) {
      return rollYearlyDateKey(timeline.startDate, ref);
    }

    let date = new Date(ref.getFullYear(), month, dayOfMonth);
    if (date < ref) {
      date = new Date(ref.getFullYear() + 1, month, dayOfMonth);
    }
    return toDateKey(date);
  }

  if (
    recurrence?.frequency === "biweekly" &&
    recurrence.days &&
    recurrence.days.length > 0
  ) {
    const targetDay = dayIndexFromName(recurrence.days[0]);
    if (targetDay < 0) return timeline.startDate ?? null;

    const anchor = timeline.startDate
      ? parseDateKey(timeline.startDate)
      : ref;

    for (let offset = 0; offset < 28; offset += 1) {
      const date = new Date(ref);
      date.setDate(ref.getDate() + offset);
      if (date.getDay() !== targetDay) continue;

      const weeksBetween = Math.round(
        (startOfDay(date).getTime() - startOfDay(anchor).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      if (weeksBetween % 2 === 0) {
        return toDateKey(date);
      }
    }

    return timeline.startDate ?? null;
  }

  if (
    recurrence?.frequency === "weekly" &&
    recurrence.days &&
    recurrence.days.length > 0
  ) {
    const targetDay = dayIndexFromName(recurrence.days[0]);
    if (targetDay < 0) return timeline.startDate ?? null;

    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(ref);
      date.setDate(ref.getDate() + offset);
      if (date.getDay() === targetDay) {
        return toDateKey(date);
      }
    }
  }

  if (timeline.startDate) {
    const date = parseDateKey(timeline.startDate);
    if (date < ref && /\bbirthday\b/i.test(timeline.sourceText)) {
      return rollYearlyDateKey(timeline.startDate, ref);
    }
    return timeline.startDate;
  }

  if (timeline.timelineRole === "deadline") {
    return timeline.deadlineDate ?? null;
  }

  return null;
}

function rollYearlyDateKey(startDate: string | undefined, reference: Date) {
  if (!startDate) return null;
  const [year, month, day] = startDate.split("-").map(Number);
  let date = new Date(reference.getFullYear(), month - 1, day);
  if (date < startOfDay(reference)) {
    date = new Date(reference.getFullYear() + 1, month - 1, day);
  }
  return toDateKey(date);
}

export function daysUntilDateKey(
  dateKey: string | null,
  reference = new Date(),
): number | null {
  if (!dateKey) return null;
  const ref = startOfDay(reference);
  const target = parseDateKey(dateKey);
  return Math.round((target.getTime() - ref.getTime()) / (24 * 60 * 60 * 1000));
}

export function isBriefEligibleMemory(
  item: {
    destinations: string[];
    category: string;
    prompt: string;
    title: string;
    parsedInput?: { moneyType?: string };
    moneyType?: string;
    timeline?: TimelineResolution | null;
  },
  reference = new Date(),
  dateKey?: string | null,
): boolean {
  const key =
    dateKey ??
    (item.timeline ? resolveNextOccurrenceDateKey(item.timeline, reference) : null);
  const days = daysUntilDateKey(key, reference);
  if (days == null || days < 0) return false;

  const text = `${item.title} ${item.prompt}`.toLowerCase();
  const isPayday =
    item.moneyType === "income" ||
    /\b(payday|pay day|get paid|paycheck)\b/.test(text);

  if (isPayday) return days <= 21;
  if (/\bbirthday\b/i.test(text)) return days <= 30;
  if (item.timeline?.timelineRole === "deadline") return days <= 14;

  return days <= 21;
}
