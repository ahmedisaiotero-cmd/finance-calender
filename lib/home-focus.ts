import {
  healthStats,
  todayHealthTrackers,
} from "@/components/health/health-mock-data";
import { toDateKey } from "@/lib/calendar-utils";
import {
  formatItemMeta,
  getTodayItems,
  getUpcomingItems,
  relativeDayLabel,
  type SyncTimelineCategory,
  type TimelineItem,
} from "@/lib/sync-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";

export type HomeFocusItem = {
  id: string;
  title: string;
  segment: string;
  category: SyncTimelineCategory;
};

const MOTIVATIONAL_LINES = [
  "Small steps count — you're making progress.",
  "Start with one priority. The rest can wait.",
  "Steady rhythm beats scattered effort.",
  "Midweek is a good time to refocus.",
  "Here's what matters next.",
  "Protect your energy for what matters.",
  "Recovery is part of taking care of yourself.",
] as const;

export function getMotivationalLine(reference = new Date()): string {
  return MOTIVATIONAL_LINES[reference.getDay()];
}

function eventToFocusItem(event: TimelineEvent): HomeFocusItem {
  let segment = "";
  if (event.detail?.segment) {
    segment = event.detail.segment;
  } else if (event.detail?.time) {
    segment = event.detail.time;
    if (event.durationMinutes != null) {
      segment = `${segment} · ${event.durationMinutes} min`;
    }
  } else if (event.durationMinutes != null) {
    segment = `${event.durationMinutes} min`;
  } else if (event.amount != null) {
    segment = formatItemMeta({
      id: event.id,
      title: event.title,
      category: event.lifeCategory as SyncTimelineCategory,
      date: event.date,
      amount: event.amount,
    }) ?? "";
  } else {
    segment = event.category;
  }

  return {
    id: event.id,
    title: event.title,
    segment,
    category: event.lifeCategory as SyncTimelineCategory,
  };
}

function timelineItemToFocusItem(
  item: TimelineItem,
  reference: Date,
): HomeFocusItem {
  const dayLabel = relativeDayLabel(item.date, reference);
  const isUpcoming = item.date !== toDateKey(reference);

  let title = item.title;
  if (isUpcoming && item.category === "money" && item.status === "due") {
    title =
      dayLabel === "Tomorrow"
        ? `${item.title} coming up tomorrow`
        : `${item.title} · ${dayLabel}`;
  } else if (isUpcoming) {
    title = `${item.title} · ${dayLabel}`;
  }

  let segment = item.time ?? "";
  if (!segment && item.category === "money" && item.amount != null) {
    segment =
      formatItemMeta(item) ??
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Math.abs(item.amount));
  }
  if (!segment) {
    segment = formatItemMeta(item) ?? "";
  }

  return {
    id: item.id,
    title,
    segment,
    category: item.category,
  };
}

function proteinFocusItem(): HomeFocusItem | null {
  const protein = todayHealthTrackers.find((t) => t.label === "Protein");
  if (!protein) return null;
  const remaining = Math.max(protein.target - protein.current, 0);
  if (remaining <= 0) return null;

  return {
    id: "focus-protein",
    title: "Protein goal",
    segment: `${remaining}g of protein remaining today`,
    category: "health",
  };
}

export function buildHomeFocusItems(
  liveToday: TimelineEvent[],
  reference = new Date(),
  maxItems = 5,
  options?: { liveOnly?: boolean },
): HomeFocusItem[] {
  const liveOnly = options?.liveOnly ?? false;
  const items: HomeFocusItem[] = [];
  const seen = new Set<string>();

  const add = (item: HomeFocusItem) => {
    if (seen.has(item.id) || items.length >= maxItems) return;
    seen.add(item.id);
    items.push(item);
  };

  for (const event of liveToday) {
    add(eventToFocusItem(event));
  }

  if (!liveOnly) {
    const protein = proteinFocusItem();
    if (protein) add(protein);

    const fallbackToday = getTodayItems(reference);
    const fallbackUpcoming = getUpcomingItems(3, reference);

    for (const item of fallbackToday) {
      add(timelineItemToFocusItem(item, reference));
    }

    for (const item of fallbackUpcoming) {
      add(timelineItemToFocusItem(item, reference));
    }
  }

  const score = (item: HomeFocusItem) => {
    if (item.title.toLowerCase().includes("coming up tomorrow")) return 1;
    if (item.category === "health") return 0;
    if (item.category === "money") return 2;
    if (item.category === "career") return 3;
    return 4;
  };

  const careerSeen = new Set<string>();
  return items
    .sort((a, b) => score(a) - score(b))
    .filter((item) => {
      if (item.category !== "career") return true;
      if (careerSeen.has("career")) return false;
      careerSeen.add("career");
      return true;
    })
    .slice(0, maxItems);
}

export function getCareerFocusTitle(reference = new Date()): string {
  const today = getTodayItems(reference).find((item) => item.category === "career");
  if (today) return today.title;
  const upcoming = getUpcomingItems(7, reference).find(
    (item) => item.category === "career",
  );
  return upcoming?.title ?? "View timeline";
}

export function getRecoveryPercent(): number {
  return healthStats.recovery.value;
}
