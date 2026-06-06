import {
  getTimelineItemsForMonthFromDb,
} from "@/lib/db/timeline-items";
import type { TimelineEvent } from "@/lib/timeline-events";

export async function getTimelineForMonthFromDb(
  year: number,
  month: number,
): Promise<TimelineEvent[]> {
  return getTimelineItemsForMonthFromDb(year, month);
}
