import { toDateKey } from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/src/data/calendar-events";
import { oneTimeEvents } from "@/src/data/calendar-events";
import { recurringBills } from "@/src/data/recurring-events";
import type { RecurringEvent } from "@/src/data/recurring-events";
import type { Transaction } from "@/src/data/transactions";
import { recentTransactions } from "@/src/data/transactions";

export type { CalendarEvent, CalendarEventSource } from "@/src/data/calendar-events";

/** Anchor relative labels like "Today" / "Yesterday" (May 2026 demo). */
export const transactionReferenceDate = new Date(2026, 4, 28);

export function resolveTransactionDate(
  displayDate: string,
  reference: Date = transactionReferenceDate,
): string {
  const trimmed = displayDate.trim();
  const lower = trimmed.toLowerCase();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (lower === "today") {
    return toDateKey(reference);
  }

  if (lower === "yesterday") {
    const d = new Date(reference);
    d.setDate(d.getDate() - 1);
    return toDateKey(d);
  }

  const withYear = Date.parse(`${trimmed} ${reference.getFullYear()}`);
  if (!Number.isNaN(withYear)) {
    return toDateKey(new Date(withYear));
  }

  return toDateKey(reference);
}

export function recurringToDateKey(
  year: number,
  month: number,
  dayOfMonth: number,
): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return toDateKey(new Date(year, month, day));
}

export function expandRecurringEvents(
  recurring: RecurringEvent[],
  year: number,
  month: number,
): CalendarEvent[] {
  return recurring.map((item) => ({
    id: `recurring-${item.id}-${year}-${month + 1}`,
    title: item.title,
    category: item.category,
    amount: item.amount,
    date: recurringToDateKey(year, month, item.dayOfMonth),
    source: "recurring" as const,
  }));
}

export function transactionsToCalendarEvents(
  transactions: Transaction[],
  reference: Date = transactionReferenceDate,
): CalendarEvent[] {
  return transactions.map((tx) => ({
    id: `tx-${tx.id}`,
    title: tx.name,
    category: tx.category,
    amount: tx.amount,
    date: tx.dateISO ?? resolveTransactionDate(tx.date, reference),
    source: "transaction" as const,
  }));
}

function isInMonth(dateKey: string, year: number, month: number) {
  const [y, m] = dateKey.split("-").map(Number);
  return y === year && m - 1 === month;
}

export function getCalendarEventsForMonth(
  year: number,
  month: number,
  options?: {
    transactions?: Transaction[];
    referenceDate?: Date;
  },
): CalendarEvent[] {
  const reference = options?.referenceDate ?? transactionReferenceDate;
  const transactions = options?.transactions ?? recentTransactions;

  const recurring = expandRecurringEvents(recurringBills, year, month);
  const fromTransactions = transactionsToCalendarEvents(
    transactions,
    reference,
  ).filter((e) => isInMonth(e.date, year, month));
  const scheduled = oneTimeEvents.filter((e) => isInMonth(e.date, year, month));

  const merged = [...recurring, ...fromTransactions, ...scheduled];

  return merged.sort((a, b) => a.date.localeCompare(b.date));
}
