import { QuickStatCard } from "@/components/dashboard/quick-stat-card";
import {
  formatTransactionTotal,
  summarizeTransactions,
} from "@/lib/transaction-utils";
import type { Transaction } from "@/src/data/transactions";

type TransactionSummaryCardsProps = {
  transactions: Transaction[];
};

export function TransactionSummaryCards({
  transactions,
}: TransactionSummaryCardsProps) {
  const { income, expenses } = summarizeTransactions(transactions);
  const net = income - expenses;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <QuickStatCard
        label="Income"
        value={formatTransactionTotal(income)}
        hint={`${transactions.filter((t) => t.amount >= 0).length} deposits`}
      />
      <QuickStatCard
        label="Expenses"
        value={formatTransactionTotal(expenses)}
        hint={`${transactions.filter((t) => t.amount < 0).length} payments`}
      />
      <QuickStatCard
        label="Net"
        value={formatTransactionTotal(net)}
        hint={net >= 0 ? "In the green" : "Over spent"}
      />
    </div>
  );
}
