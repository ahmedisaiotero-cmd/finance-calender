import type { TimelineItem as DbTimelineItem } from "@prisma/client";

import { toDateKey } from "@/lib/calendar-utils";
import { prisma } from "@/lib/prisma";
import type { TimelineEvent } from "@/lib/timeline-events";

export type TimelineItemDetail = {
  time?: string;
  durationMinutes?: number;
  amount?: number;
  segment?: string;
  note?: string;
};

const VALID_CATEGORIES = new Set([
  "money",
  "health",
  "career",
  "personal",
  "relationships",
]);

function parseDetail(raw: DbTimelineItem["detail"]): TimelineItemDetail | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as TimelineItemDetail;
}

export function dbTimelineItemToEvent(item: DbTimelineItem): TimelineEvent {
  const detail = parseDetail(item.detail);
  const lifeCategory = VALID_CATEGORIES.has(item.category)
    ? (item.category as TimelineEvent["lifeCategory"])
    : "personal";

  return {
    id: item.id,
    title: item.title,
    date: toDateKey(item.date),
    lifeCategory,
    category: item.category,
    source: "database",
    status: item.status.toLowerCase(),
    amount: detail?.amount,
    durationMinutes: detail?.durationMinutes,
    detail: detail ?? undefined,
  };
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end };
}

export async function getTimelineItemsForMonthFromDb(
  year: number,
  month: number,
  workspaceId: string,
): Promise<TimelineEvent[]> {
  const { start, end } = monthRange(year, month);

  const items = await prisma.timelineItem.findMany({
    where: {
      workspaceId,
      date: { gte: start, lt: end },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return items.map(dbTimelineItemToEvent);
}

export async function getTimelineItemsForDateFromDb(
  dateKey: string,
  workspaceId: string,
): Promise<TimelineEvent[]> {
  const date = new Date(`${dateKey}T12:00:00`);

  const items = await prisma.timelineItem.findMany({
    where: {
      workspaceId,
      date,
    },
    orderBy: { createdAt: "asc" },
  });

  return items.map(dbTimelineItemToEvent);
}
