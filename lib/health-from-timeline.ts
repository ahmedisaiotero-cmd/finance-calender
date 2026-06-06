import { toDateKey } from "@/lib/calendar-utils";
import type { TimelineEvent } from "@/lib/timeline-events";

function weekBounds(reference: Date) {
  const weekStart = new Date(reference);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

function isInWeek(dateKey: string, reference: Date) {
  const date = new Date(`${dateKey}T12:00:00`);
  const { weekStart, weekEnd } = weekBounds(reference);
  return date >= weekStart && date <= weekEnd;
}

/** Distinct health session days completed this week (today and earlier). */
export function countHealthSessionsThisWeek(
  timeline: TimelineEvent[],
  reference = new Date(),
): number {
  const todayKey = toDateKey(reference);
  const days = new Set<string>();

  for (const event of timeline) {
    if (event.lifeCategory !== "health") continue;
    if (!isInWeek(event.date, reference)) continue;
    if (event.date > todayKey) continue;
    days.add(event.date);
  }

  return days.size;
}

/** Next health item today or later this week. */
export function getNextHealthOpportunity(
  timeline: TimelineEvent[],
  reference = new Date(),
): string | null {
  const todayKey = toDateKey(reference);
  const upcoming = timeline
    .filter(
      (event) =>
        event.lifeCategory === "health" &&
        isInWeek(event.date, reference) &&
        event.date >= todayKey,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const next = upcoming[0];
  if (!next) return null;
  if (next.date === todayKey) return "today";
  return new Date(`${next.date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

export function countCareerFocusAreas(
  timeline: TimelineEvent[],
  reference = new Date(),
): number {
  const todayKey = toDateKey(reference);
  const count = timeline.filter(
    (event) =>
      event.lifeCategory === "career" && event.date >= todayKey,
  ).length;
  return Math.max(count, 1);
}

export function getCareerFocusTitleFromTimeline(
  timeline: TimelineEvent[],
  reference = new Date(),
): string {
  const todayKey = toDateKey(reference);
  const todayCareer = timeline.find(
    (event) => event.lifeCategory === "career" && event.date === todayKey,
  );
  if (todayCareer) return todayCareer.title;

  const upcoming = timeline
    .filter(
      (event) => event.lifeCategory === "career" && event.date > todayKey,
    )
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return upcoming?.title ?? "View timeline";
}

export function getMoneyUpcomingFromTimeline(
  timeline: TimelineEvent[],
  reference = new Date(),
) {
  const todayKey = toDateKey(reference);
  return timeline
    .filter(
      (event) =>
        event.lifeCategory === "money" &&
        event.date >= todayKey &&
        event.amount != null &&
        event.amount < 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
