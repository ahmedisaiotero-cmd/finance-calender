import { toDateKey } from "@/lib/calendar-utils";
import { relativeDayLabel } from "@/lib/sync-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";

export type HomeUpcomingEvent = {
  id: string;
  title: string;
  dayLabel: string;
  category: TimelineEvent["lifeCategory"];
};

export function getUpcomingTimelineEvents(
  timeline: TimelineEvent[],
  reference = new Date(),
  limit = 6,
): HomeUpcomingEvent[] {
  const todayKey = toDateKey(reference);

  return timeline
    .filter((event) => event.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      title: event.title,
      dayLabel: relativeDayLabel(event.date, reference),
      category: event.lifeCategory,
    }));
}
