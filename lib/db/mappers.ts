import type { CalendarEvent } from "@/src/data/calendar-events";
import type { Transaction } from "@/src/data/transactions";
import { toDateKey } from "@/lib/calendar-utils";

type DbTransaction = {
  id: string;
  name: string;
  amountCents: number;
  occurredAt: Date;
  category: { name: string };
};

export function dbTransactionToUi(tx: DbTransaction): Transaction {
  const dateISO = toDateKey(tx.occurredAt);
  return {
    id: tx.id,
    name: tx.name,
    category: tx.category.name,
    amount: tx.amountCents / 100,
    date: formatDisplayDate(tx.occurredAt),
    dateISO,
  };
}

export function formatDisplayDate(date: Date) {
  const today = toDateKey(new Date());
  const key = toDateKey(date);
  if (key === today) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDateKey(yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}

export function calendarEventFromParts(parts: {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  source: CalendarEvent["source"];
}): CalendarEvent {
  return parts;
}
