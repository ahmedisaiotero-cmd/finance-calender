"use client";

import { useMemo } from "react";

import { BudgetCard } from "@/components/budgets/budget-card";
import { QuickStatCard } from "@/components/dashboard/quick-stat-card";
import {
  formatTransactionTotal,
  spendingByCategory,
} from "@/lib/transaction-utils";
import { categoryBudgets } from "@/src/data/budgets";
import type { Transaction } from "@/src/data/transactions";

type BudgetOverviewProps = {
  transactions: Transaction[];
  monthLabel: string;
};

export function BudgetOverview({
  transactions,
  monthLabel,
}: BudgetOverviewProps) {
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

  return (
    <section id="budgets" className="scroll-mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Budgets</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Category limits for {monthLabel} — synced with your transactions
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickStatCard
          label="Monthly budget"
          value={formatTransactionTotal(totals.totalBudget)}
          hint="All categories"
        />
        <QuickStatCard
          label="Spent this month"
          value={formatTransactionTotal(totals.totalSpent)}
          hint="From logged transactions"
        />
        <QuickStatCard
          label="Over budget"
          value={String(totals.overBudget)}
          hint={
            totals.overBudget === 0 ? "On track" : "Needs attention"
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
    </section>
  );
}
