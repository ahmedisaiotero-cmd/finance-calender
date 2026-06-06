import { toDateKey } from "@/lib/calendar-utils";
import { monthlySpending } from "@/lib/mock-data";
import type { TimelineEvent } from "@/lib/timeline-events";

export type SyncTimelineCategory = "money" | "health" | "personal" | "career";

export type TimelineItem = {
  id: string;
  title: string;
  category: SyncTimelineCategory;
  date: string;
  time?: string;
  amount?: number;
  detail?: string;
  status?: "complete" | "planned" | "due";
};

export type WeeklyStatus = {
  monthLabel: string;
  moneySpent: number;
  moneyBudget: number;
  healthActiveDays: number;
  healthGoalDays: number;
  focusLabel: string;
  careerFocusCount: number;
};

function offsetDateKey(reference: Date, dayOffset: number) {
  const date = new Date(reference);
  date.setDate(date.getDate() + dayOffset);
  return toDateKey(date);
}

function isInMonth(dateKey: string, year: number, month: number) {
  const [y, m] = dateKey.split("-").map(Number);
  return y === year && m - 1 === month;
}

/** Canonical mock timeline — all pages read from here when live data is sparse. */
export function buildSyncTimeline(reference = new Date()): TimelineItem[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const monthMid = offsetDateKey(new Date(year, month, 15), 0);

  return [
    // Today
    {
      id: "sync-today-run",
      title: "Morning run",
      category: "health",
      date: offsetDateKey(reference, 0),
      time: "7:00 AM",
      detail: "30 min",
      status: "planned",
    },
    {
      id: "sync-today-standup",
      title: "Team standup",
      category: "career",
      date: offsetDateKey(reference, 0),
      time: "9:00 AM",
      detail: "15 min",
      status: "planned",
    },
    // Upcoming days
    {
      id: "sync-up-meal-prep",
      title: "Meal prep",
      category: "health",
      date: offsetDateKey(reference, 1),
      detail: "60 min",
      status: "planned",
    },
    {
      id: "sync-up-yoga",
      title: "Yoga flow",
      category: "health",
      date: offsetDateKey(reference, 2),
      detail: "40 min",
      status: "planned",
    },
    {
      id: "sync-up-review",
      title: "Product review",
      category: "career",
      date: offsetDateKey(reference, 0),
      time: "2:00 PM",
      detail: "Draft due",
      status: "due",
    },
    {
      id: "sync-up-run",
      title: "Morning run",
      category: "health",
      date: offsetDateKey(reference, 4),
      detail: "30 min",
      status: "planned",
    },
    // Money — upcoming obligations
    {
      id: "sync-money-rent",
      title: "Rent",
      category: "money",
      date: offsetDateKey(reference, 1),
      amount: -1200,
      status: "due",
    },
    {
      id: "sync-money-electric",
      title: "Electric bill",
      category: "money",
      date: offsetDateKey(reference, 8),
      amount: -110,
      status: "due",
    },
    {
      id: "sync-money-card",
      title: "Credit card payment",
      category: "money",
      date: offsetDateKey(reference, 12),
      amount: -250,
      status: "due",
    },
    // Recent / month context
    {
      id: "sync-money-groceries",
      title: "Grocery run",
      category: "money",
      date: offsetDateKey(reference, -2),
      amount: -85,
      status: "complete",
    },
    {
      id: "sync-health-strength",
      title: "Strength training",
      category: "health",
      date: offsetDateKey(reference, -1),
      detail: "45 min",
      status: "complete",
    },
    {
      id: "sync-personal-planning",
      title: "Weekly planning",
      category: "personal",
      date: offsetDateKey(reference, 6),
      detail: "30 min",
      status: "planned",
    },
    // Anchor a few items to mid-month for calendar density
    {
      id: "sync-cal-insurance",
      title: "Car insurance",
      category: "money",
      date: monthMid,
      amount: -142,
      status: "due",
    },
    {
      id: "sync-cal-physical",
      title: "Annual physical",
      category: "health",
      date: offsetDateKey(new Date(year, month, 22), 0),
      detail: "60 min",
      status: "planned",
    },
  ];
}

export function getSyncTimeline(reference = new Date()): TimelineItem[] {
  return buildSyncTimeline(reference);
}

export function getItemsForDate(
  dateKey: string,
  reference = new Date(),
): TimelineItem[] {
  return getSyncTimeline(reference)
    .filter((item) => item.date === dateKey)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
}

export function getTodayItems(reference = new Date()): TimelineItem[] {
  return getItemsForDate(toDateKey(reference), reference);
}

export function getUpcomingItems(
  horizonDays = 3,
  reference = new Date(),
): TimelineItem[] {
  const todayKey = toDateKey(reference);
  const end = new Date(reference);
  end.setDate(end.getDate() + horizonDays);
  const endKey = toDateKey(end);

  return getSyncTimeline(reference)
    .filter((item) => item.date > todayKey && item.date <= endKey)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

export function getMoneyUpcoming(reference = new Date()): TimelineItem[] {
  const todayKey = toDateKey(reference);
  return getSyncTimeline(reference)
    .filter(
      (item) =>
        item.category === "money" &&
        item.date >= todayKey &&
        item.amount != null &&
        item.amount < 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getItemsForMonth(
  year: number,
  month: number,
  reference = new Date(),
): TimelineItem[] {
  return getSyncTimeline(reference).filter((item) =>
    isInMonth(item.date, year, month),
  );
}

export function getWeeklyStatus(reference = new Date()): WeeklyStatus {
  const weekStart = new Date(reference);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekItems = getSyncTimeline(reference).filter((item) => {
    const date = new Date(`${item.date}T12:00:00`);
    return (
      item.category === "health" &&
      date >= weekStart &&
      date <= weekEnd
    );
  });

  const activeDays = new Set(weekItems.map((item) => item.date)).size;
  const careerDue = getSyncTimeline(reference).filter(
    (item) =>
      item.category === "career" &&
      item.status === "due" &&
      item.date >= toDateKey(reference),
  ).length;

  const careerFocusCount = Math.max(careerDue, 1);

  return {
    monthLabel: reference.toLocaleDateString("en-US", { month: "long" }),
    moneySpent: Math.round(monthlySpending.spent),
    moneyBudget: monthlySpending.budget,
    healthActiveDays: Math.max(activeDays, 4),
    healthGoalDays: 5,
    careerFocusCount,
    focusLabel:
      careerDue > 0
        ? `${careerDue} career focus ${careerDue === 1 ? "area" : "areas"}`
        : "On track this week",
  };
}

export function itemToTimelineEvent(item: TimelineItem): TimelineEvent {
  const durationMatch = item.detail?.match(/(\d+)\s*min/);
  return {
    id: item.id,
    title: item.title,
    date: item.date,
    lifeCategory: item.category,
    category: item.category,
    source: "sync",
    amount: item.amount,
    durationMinutes: durationMatch ? Number(durationMatch[1]) : undefined,
  };
}

export function syncTimelineAsEvents(
  year: number,
  month: number,
  reference = new Date(),
): TimelineEvent[] {
  return getItemsForMonth(year, month, reference).map(itemToTimelineEvent);
}

/** Prefer live timeline events; fill gaps from shared mock timeline. */
export function mergeWithSyncTimeline(
  live: TimelineEvent[],
  year: number,
  month: number,
  reference = new Date(),
): TimelineEvent[] {
  const fallback = syncTimelineAsEvents(year, month, reference);
  const liveIds = new Set(live.map((e) => e.id));
  const liveDates = new Set(live.map((e) => e.date));
  const extras = fallback.filter(
    (e) => !liveIds.has(e.id) && !liveDates.has(e.date),
  );
  return [...live, ...extras].sort((a, b) => a.date.localeCompare(b.date));
}

export function formatItemMeta(item: TimelineItem): string | undefined {
  if (item.amount != null) {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: Math.abs(item.amount) % 1 === 0 ? 0 : 2,
    }).format(Math.abs(item.amount));
    return item.amount < 0 ? formatted : `+${formatted}`;
  }
  return item.detail;
}

export function relativeDayLabel(dateKey: string, reference = new Date()) {
  const target = new Date(`${dateKey}T12:00:00`);
  const todayMid = new Date(reference);
  todayMid.setHours(12, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === 0) return "Today";
  return target.toLocaleDateString("en-US", { weekday: "short" });
}

export function shortDateLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
