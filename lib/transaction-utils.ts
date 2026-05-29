import {
  resolveTransactionDate,
  transactionReferenceDate,
} from "@/lib/build-calendar-events";
import type { Transaction } from "@/src/data/transactions";

export const TRANSACTION_CATEGORIES = [
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Subscriptions",
  "Utilities",
  "Housing",
  "Income",
  "Other",
] as const;

export type SortOption =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc"
  | "name-asc";

export function summarizeTransactions(transactions: Transaction[]) {
  return transactions.reduce(
    (acc, tx) => {
      if (tx.amount >= 0) {
        acc.income += tx.amount;
      } else {
        acc.expenses += Math.abs(tx.amount);
      }
      return acc;
    },
    { income: 0, expenses: 0 },
  );
}

export function formatTransactionTotal(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getTransactionCategories(transactions: Transaction[]) {
  const fromData = transactions.map((tx) => tx.category);
  return [...new Set([...TRANSACTION_CATEGORIES, ...fromData])].sort();
}

export function getTransactionDateKey(
  tx: Transaction,
  reference = transactionReferenceDate,
) {
  return tx.dateISO ?? resolveTransactionDate(tx.date, reference);
}

export function filterTransactionsForMonth(
  transactions: Transaction[],
  year: number,
  month: number,
) {
  return transactions.filter((tx) => {
    const [y, m] = getTransactionDateKey(tx).split("-").map(Number);
    return y === year && m - 1 === month;
  });
}

export function filterTransactionsForDay(
  transactions: Transaction[],
  dateKey: string,
) {
  return transactions.filter(
    (tx) => getTransactionDateKey(tx) === dateKey,
  );
}

function transactionTimestamp(tx: Transaction) {
  return new Date(getTransactionDateKey(tx)).getTime();
}

export function filterTransactions(
  transactions: Transaction[],
  query: string,
  category: string,
) {
  const normalized = query.trim().toLowerCase();

  return transactions.filter((tx) => {
    const matchesCategory = category === "All" || tx.category === category;
    const matchesQuery =
      !normalized ||
      tx.name.toLowerCase().includes(normalized) ||
      tx.category.toLowerCase().includes(normalized) ||
      tx.date.toLowerCase().includes(normalized);

    return matchesCategory && matchesQuery;
  });
}

export function sortTransactions(
  transactions: Transaction[],
  sort: SortOption,
): Transaction[] {
  const sorted = [...transactions];

  sorted.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return transactionTimestamp(a) - transactionTimestamp(b);
      case "date-desc":
        return transactionTimestamp(b) - transactionTimestamp(a);
      case "amount-asc":
        return a.amount - b.amount;
      case "amount-desc":
        return b.amount - a.amount;
      case "name-asc":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return sorted;
}

export function spendingByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.amount >= 0) continue;
    map.set(tx.category, (map.get(tx.category) ?? 0) + Math.abs(tx.amount));
  }

  return map;
}
