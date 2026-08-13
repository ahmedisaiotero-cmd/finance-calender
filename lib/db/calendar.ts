import type { RecurringRule } from "@prisma/client";
import { Domain, EventSource } from "@prisma/client";

import { recurringToDateKey, transactionsToCalendarEvents } from "@/lib/build-calendar-events";
import { toDateKey } from "@/lib/calendar-utils";
import { dbTransactionToUi } from "@/lib/db/mappers";
import { prisma } from "@/lib/prisma";
import type { CalendarEvent } from "@/src/data/calendar-events";

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end };
}

function expandMonthlyRule(
  rule: RecurringRule & { category: { name: string } | null },
  year: number,
  month: number,
): CalendarEvent[] {
  const config = rule.ruleConfig as { dayOfMonth?: number };
  const dayOfMonth = config.dayOfMonth ?? 1;
  const date = recurringToDateKey(year, month, dayOfMonth);

  return [
    {
      id: `recurring-${rule.id}-${date}`,
      title: rule.title,
      category: rule.category?.name ?? "General",
      amount: (rule.amountCents ?? 0) / 100,
      date,
      source: "recurring",
    },
  ];
}

export async function getCalendarEventsForMonthFromDb(
  year: number,
  month: number,
  workspaceId: string,
): Promise<CalendarEvent[]> {
  const { start, end } = monthRange(year, month);

  const [transactions, scheduledEvents, recurringRules] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        occurredAt: { gte: start, lt: end },
      },
      include: { category: true },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.event.findMany({
      where: {
        workspaceId,
        domain: Domain.FINANCE,
        deletedAt: null,
        source: { in: [EventSource.MANUAL, EventSource.IMPORTED] },
        startsAt: { gte: start, lt: end },
        transaction: null,
      },
      include: { category: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.recurringRule.findMany({
      where: {
        workspaceId,
        domain: Domain.FINANCE,
        active: true,
      },
      include: { category: true },
    }),
  ]);

  const fromTransactions = transactionsToCalendarEvents(
    transactions.map(dbTransactionToUi),
  );

  const fromScheduled: CalendarEvent[] = scheduledEvents.map((event) => ({
    id: event.id,
    title: event.title,
    category: event.category?.name ?? "General",
    amount: (event.amountCents ?? 0) / 100,
    date: toDateKey(event.startsAt),
    source: "scheduled",
  }));

  const fromRecurring = recurringRules.flatMap((rule) =>
    expandMonthlyRule(rule, year, month),
  );

  return [...fromRecurring, ...fromTransactions, ...fromScheduled].sort(
    (a, b) => a.date.localeCompare(b.date),
  );
}
