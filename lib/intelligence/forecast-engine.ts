import type { SyncUserContext } from "@/lib/intelligence/sync-user-context";
import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";

export type CapturedItem = {
  id: string;
  title: string;
  category?: string;
  destinations?: string[];
  prompt?: string;
  amount?: string | null;
  moneyType?: string;
  timeline?: TimelineResolution;
  createdAt?: string;
};

export type SyncForecast = {
  title: string;
  summary: string;
  cards: ForecastCard[];
};

export type ForecastCard = {
  id: string;
  area: "calendar" | "finance" | "health" | "work" | "goals";
  title: string;
  message: string;
  severity: "calm" | "notice" | "important";
  date?: string;
};

type GenerateForecastInput = {
  items: CapturedItem[];
  userContext?: SyncUserContext;
  now?: Date;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function daysUntil(dateKey: string, now: Date) {
  const start = new Date(toDateKey(now));
  const target = new Date(dateKey);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function itemDate(item: CapturedItem) {
  return item.timeline?.deadlineDate ?? item.timeline?.startDate;
}

function inRange(dateKey: string | undefined, start: string, end: string) {
  return !!dateKey && dateKey >= start && dateKey <= end;
}

function isScheduledBlock(item: CapturedItem) {
  return (
    item.timeline?.isTimed === true &&
    (item.timeline.timelineRole === "event" ||
      item.timeline.timelineRole === "schedule")
  );
}

function isWorkItem(item: CapturedItem) {
  return (
    item.destinations?.includes("Work") ||
    item.category === "workday" ||
    /\b(work|shift|job)\b/i.test(`${item.title} ${item.prompt}`)
  );
}

function isHealthLog(item: CapturedItem) {
  return (
    item.destinations?.includes("Health") ||
    item.category === "workout" ||
    /\b(gym|workout|run|health)\b/i.test(`${item.title} ${item.prompt}`)
  );
}

function isGoalTime(item: CapturedItem) {
  return (
    item.destinations?.includes("Goals") ||
    /\b(sync|project|business|study|studied|goal)\b/i.test(
      `${item.title} ${item.prompt}`,
    )
  );
}

function formatDueMessage(title: string, dateKey: string, now: Date) {
  const days = daysUntil(dateKey, now);
  if (days <= 0) return `${title} is due today.`;
  if (days === 1) return `${title} is due tomorrow.`;
  return `${title} is due in ${days} days.`;
}

function amountValue(amount?: string | null) {
  if (!amount) return null;
  const parsed = Number(amount.replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function isSubscription(item: CapturedItem) {
  return (
    item.category === "subscription" ||
    /\b(subscription|subscribed|renewal|spotify|netflix)\b/i.test(
      `${item.title} ${item.prompt}`,
    )
  );
}

function isPayday(item: CapturedItem) {
  return (
    item.moneyType === "income" ||
    /\b(payday|get paid|paycheck|direct deposit|income)\b/i.test(
      `${item.title} ${item.prompt}`,
    )
  );
}

export function generateForecast({
  items,
  userContext,
  now = new Date(),
}: GenerateForecastInput): SyncForecast {
  const startKey = toDateKey(now);
  const endKey = toDateKey(addDays(now, 7));
  const cards: ForecastCard[] = [];

  const upcomingDeadlines = items
    .filter((item) =>
      inRange(item.timeline?.deadlineDate, startKey, endKey),
    )
    .sort((a, b) =>
      (a.timeline?.deadlineDate ?? "").localeCompare(
        b.timeline?.deadlineDate ?? "",
      ),
    );

  for (const item of upcomingDeadlines.slice(0, 2)) {
    const date = item.timeline?.deadlineDate;
    if (!date) continue;
    const finance = item.destinations?.includes("Finance") || item.category === "expense";
    cards.push({
      id: `deadline-${item.id}`,
      area: finance ? "finance" : "calendar",
      title: item.title,
      message: formatDueMessage(item.title, date, now),
      severity: daysUntil(date, now) <= 2 ? "important" : "notice",
      date,
    });
  }

  const upcomingFinance = items
    .filter((item) => {
      const date = itemDate(item);
      if (!inRange(date, startKey, endKey)) return false;
      return (
        isPayday(item) ||
        isSubscription(item) ||
        (item.destinations?.includes("Finance") && amountValue(item.amount) !== null)
      );
    })
    .sort((a, b) => (itemDate(a) ?? "").localeCompare(itemDate(b) ?? ""));

  for (const item of upcomingFinance.slice(0, 2)) {
    const date = itemDate(item);
    const amount = amountValue(item.amount);
    if (isPayday(item)) {
      cards.push({
        id: `payday-${item.id}`,
        area: "finance",
        title: "Payday",
        message: "Payday is coming up.",
        severity: "calm",
        date,
      });
      continue;
    }

    if (isSubscription(item)) {
      cards.push({
        id: `subscription-${item.id}`,
        area: "finance",
        title: item.title,
        message: `${item.title} is coming up.`,
        severity: "calm",
        date,
      });
      continue;
    }

    if (amount !== null && amount >= 500) {
      cards.push({
        id: `large-expense-${item.id}`,
        area: "finance",
        title: item.title,
        message: `${item.title} may affect your budget.`,
        severity: "notice",
        date,
      });
    }
  }

  const scheduledByDate = new Map<string, CapturedItem[]>();
  for (const item of items) {
    const date = item.timeline?.startDate;
    if (!inRange(date, startKey, endKey) || !isScheduledBlock(item)) continue;
    scheduledByDate.set(date!, [...(scheduledByDate.get(date!) ?? []), item]);
  }

  const busiest = [...scheduledByDate.entries()]
    .filter(([, dayItems]) => dayItems.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (busiest) {
    cards.push({
      id: `busy-${busiest[0]}`,
      area: "calendar",
      title: "Busy day",
      message: `${busiest[0]} looks busy.`,
      severity: busiest[1].length >= 3 ? "important" : "notice",
      date: busiest[0],
    });
  }

  const upcomingWork = items
    .filter((item) => inRange(itemDate(item), startKey, endKey) && isWorkItem(item))
    .sort((a, b) => (itemDate(a) ?? "").localeCompare(itemDate(b) ?? ""));
  if (upcomingWork.length > 0) {
    const item = upcomingWork[0];
    cards.push({
      id: `work-${item.id}`,
      area: "work",
      title: "Work ahead",
      message: `${item.title} is coming up.`,
      severity: "calm",
      date: itemDate(item),
    });
  }

  const healthRoutine = userContext?.routines?.find(
    (routine) => routine.area === "health",
  );
  const healthLoggedThisWeek = items.some(
    (item) => inRange(itemDate(item) ?? item.createdAt?.slice(0, 10), startKey, endKey) && isHealthLog(item),
  );
  if (items.length > 0 && healthRoutine && !healthLoggedThisWeek) {
    cards.push({
      id: `health-routine-${healthRoutine.id}`,
      area: "health",
      title: "Health rhythm",
      message: `No ${healthRoutine.title.toLowerCase()} logged this week.`,
      severity: "calm",
    });
  }

  const goalTime = items.find(
    (item) => inRange(itemDate(item), startKey, endKey) && isGoalTime(item),
  );
  if (goalTime) {
    cards.push({
      id: `goal-${goalTime.id}`,
      area: "goals",
      title: "Goal time",
      message: `${goalTime.title} is on your timeline.`,
      severity: "calm",
      date: itemDate(goalTime),
    });
  }
  if (!goalTime && items.length > 0) {
    const syncGoal = userContext?.goals?.find((goal) =>
      /\bsync|project|business\b/i.test(goal.title),
    );
    if (syncGoal) {
      cards.push({
        id: `goal-missing-${syncGoal.id}`,
        area: "goals",
        title: syncGoal.title,
        message: `${syncGoal.title} has no time planned.`,
        severity: "calm",
      });
    }
  }

  const uniqueCards = cards.filter(
    (card, index, all) => all.findIndex((item) => item.id === card.id) === index,
  );
  const areaPriority: Record<ForecastCard["area"], number> = {
    finance: 0,
    calendar: 1,
    work: 2,
    goals: 3,
    health: 4,
  };

  return {
    title: "What matters next",
    summary:
      uniqueCards.length > 0
        ? "A few things worth keeping in view."
        : "Nothing urgent right now.",
    cards: uniqueCards
      .sort((a, b) => areaPriority[a.area] - areaPriority[b.area])
      .slice(0, 4),
  };
}
