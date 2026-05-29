"use client";

import { useMemo } from "react";

import { BudgetCard } from "@/components/budgets/budget-card";
import { QuickStatCard } from "@/components/dashboard/quick-stat-card";
import { useTransactions } from "@/hooks/use-transactions";
import {
  formatTransactionTotal,
  spendingByCategory,
} from "@/lib/transaction-utils";
import { categoryBudgets } from "@/src/data/budgets";

export function BudgetsContent() {
  const { transactions, ready } = useTransactions();

  const spentMap = useMemo(
    () => spendingByCategory(transactions),
    [transactions],
  );

  const totals = useMemo(() => {
    const totalBudget = categoryBudgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = categoryBudgets.reduce(
      (sum, b) => sum + (spentMap.get(b.category) ?? 0),
      0,
    );
    const overBudget = categoryBudgets.filter(
      (b) => (spentMap.get(b.category) ?? 0) > b.limit,
    ).length;

    return { totalBudget, totalSpent, overBudget };
  }, [spentMap]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Loading budgets…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickStatCard
          label="Total budget"
          value={formatTransactionTotal(totals.totalBudget)}
          hint="All categories combined"
        />
        <QuickStatCard
          label="Total spent"
          value={formatTransactionTotal(totals.totalSpent)}
          hint="From your transactions"
        />
        <QuickStatCard
          label="Over budget"
          value={String(totals.overBudget)}
          hint={
            totals.overBudget === 0
              ? "All categories on track"
              : "Categories need attention"
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categoryBudgets.map((budget) => (
          <BudgetCard
            key={budget.category}
            budget={budget}
            spent={spentMap.get(budget.category) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
