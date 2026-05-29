import { toDateKey } from "@/lib/calendar-utils";
import {
  resolveTransactionDate,
  transactionReferenceDate,
} from "@/lib/build-calendar-events";
import type { HealthActivity } from "@/src/data/health-activities";
import { healthActivities } from "@/src/data/health-activities";
import type { HealthEvent } from "@/src/data/health-events";
import { scheduledHealthEvents } from "@/src/data/health-events";
import type { RecurringHealthEvent } from "@/src/data/recurring-health-events";
import { recurringHealthEvents } from "@/src/data/recurring-health-events";

function isInMonth(dateKey: string, year: number, month: number) {
  const [y, m] = dateKey.split("-").map(Number);
  return y === year && m - 1 === month;
}

export function expandWeeklyHealthEvents(
  recurring: RecurringHealthEvent[],
  year: number,
  month: number,
): HealthEvent[] {
  const events: HealthEvent[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const dateKey = toDateKey(date);

    for (const item of recurring) {
      if (!item.daysOfWeek.includes(dayOfWeek)) continue;
      events.push({
        id: `health-recurring-${item.id}-${dateKey}`,
        title: item.title,
        category: item.category,
        date: dateKey,
        source: "recurring",
        durationMinutes: item.durationMinutes,
      });
    }
  }

  return events;
}

export function activitiesToHealthEvents(
  activities: HealthActivity[],
  reference = transactionReferenceDate,
): HealthEvent[] {
  return activities.map((activity) => ({
    id: `health-log-${activity.id}`,
    title: activity.title,
    category: activity.category,
    date:
      activity.dateISO ??
      resolveTransactionDate(activity.date, reference),
    source: "logged" as const,
    durationMinutes: activity.durationMinutes,
  }));
}

export function getHealthEventsForMonth(
  year: number,
  month: number,
  options?: {
    activities?: HealthActivity[];
    referenceDate?: Date;
  },
): HealthEvent[] {
  const reference = options?.referenceDate ?? transactionReferenceDate;
  const activities = options?.activities ?? healthActivities;

  const recurring = expandWeeklyHealthEvents(
    recurringHealthEvents,
    year,
    month,
  );
  const logged = activitiesToHealthEvents(activities, reference).filter((e) =>
    isInMonth(e.date, year, month),
  );
  const scheduled = scheduledHealthEvents.filter((e) =>
    isInMonth(e.date, year, month),
  );

  return [...recurring, ...logged, ...scheduled].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function totalActiveMinutes(events: HealthEvent[]) {
  return events.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
}

export function countByCategory(events: HealthEvent[]) {
  const map = new Map<string, number>();
  for (const event of events) {
    map.set(event.category, (map.get(event.category) ?? 0) + 1);
  }
  return map;
}
