import type { Transaction } from "@/src/data/transactions";

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
  return [...new Set(transactions.map((tx) => tx.category))].sort();
}
