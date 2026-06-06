import type { TimelineEvent } from "@/lib/timeline-events";

/** Surface a balanced mix of Money + Health events in each day cell. */
export function pickIntegratedDisplayEvents(
  events: TimelineEvent[],
  max = 3,
) {
  if (events.length <= max) return events;

  const health = events.filter((e) => e.lifeCategory === "health");
  const money = events.filter((e) => e.lifeCategory === "money");
  const picked: TimelineEvent[] = [];
  let healthIdx = 0;
  let moneyIdx = 0;

  while (
    picked.length < max &&
    (healthIdx < health.length || moneyIdx < money.length)
  ) {
    if (healthIdx < health.length) {
      picked.push(health[healthIdx]);
      healthIdx += 1;
    }
    if (picked.length >= max) break;
    if (moneyIdx < money.length) {
      picked.push(money[moneyIdx]);
      moneyIdx += 1;
    }
  }

  return picked;
}

export function calendarDayCategories(events: TimelineEvent[]) {
  return {
    hasHealth: events.some((e) => e.lifeCategory === "health"),
    hasMoney: events.some((e) => e.lifeCategory === "money"),
    hasMoneyIncome: events.some(
      (e) => e.lifeCategory === "money" && (e.amount ?? 0) >= 0,
    ),
    hasMoneyExpense: events.some(
      (e) => e.lifeCategory === "money" && (e.amount ?? 0) < 0,
    ),
  };
}

export type DayCategoryDot = "health" | "money" | "money-income";

/** Up to three category dots for month scan cells. */
export function dayCategoryDots(events: TimelineEvent[]): DayCategoryDot[] {
  const cats = calendarDayCategories(events);
  const dots: DayCategoryDot[] = [];

  if (cats.hasHealth) dots.push("health");
  if (cats.hasMoneyExpense) dots.push("money");
  if (cats.hasMoneyIncome) dots.push("money-income");

  return dots.slice(0, 3);
}
