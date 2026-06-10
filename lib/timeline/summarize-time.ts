import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";

type TimeSummaryItem = {
  category?: string;
  title?: string;
  createdAt?: string;
  timeline?: TimelineResolution;
};

type TimeSummaryRange = {
  startDate: string;
  endDate: string;
};

export type TimeByCategorySummary = {
  category: string;
  totalMinutes: number;
  itemCount: number;
};

function durationBetween(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return 0;
  const [startHourText, startMinuteText = "0"] = startTime.split(":");
  const [endHourText, endMinuteText = "0"] = endTime.split(":");
  const startHour = Number(startHourText);
  const startMinute = Number(startMinuteText);
  const endHour = Number(endHourText);
  const endMinute = Number(endMinuteText);
  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return 0;
  }

  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end <= start) end += 24 * 60;
  return end - start;
}

function itemDate(item: TimeSummaryItem) {
  return (
    item.timeline?.startDate ??
    item.timeline?.deadlineDate ??
    item.createdAt?.slice(0, 10)
  );
}

export function summarizeTimeByCategory(
  items: TimeSummaryItem[],
  range: TimeSummaryRange,
): TimeByCategorySummary[] {
  const summaries = new Map<string, TimeByCategorySummary>();

  for (const item of items) {
    const timeline = item.timeline;
    const date = itemDate(item);
    if (!timeline || !date || date < range.startDate || date > range.endDate) {
      continue;
    }

    const minutes =
      timeline.durationMinutes ??
      (timeline.isTimed
        ? durationBetween(timeline.startTime, timeline.endTime)
        : 0);
    if (minutes <= 0) continue;

    const category = item.category ?? item.title ?? "Other";
    const current =
      summaries.get(category) ?? { category, totalMinutes: 0, itemCount: 0 };
    current.totalMinutes += minutes;
    current.itemCount += 1;
    summaries.set(category, current);
  }

  return [...summaries.values()].sort((a, b) =>
    a.category.localeCompare(b.category),
  );
}
