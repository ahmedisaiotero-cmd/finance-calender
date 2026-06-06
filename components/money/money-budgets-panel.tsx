"use client";

import { useMemo } from "react";

import { moneyBudgetSpendingFallback } from "@/components/money/money-mock-data";
import { ProgressRow, SectionPanel } from "@/components/sync";
import { buildBudgetCategoryNote } from "@/lib/sync-pulse";
import { monthlySpending } from "@/lib/mock-data";
import {
  formatTransactionTotal,
  spendingByCategory,
} from "@/lib/transaction-utils";
import { categoryBudgets } from "@/src/data/budgets";
import type { Transaction } from "@/src/data/transactions";

type MoneyBudgetsPanelProps = {
  transactions: Transaction[];
};

function budgetPercent(spent: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(Math.round((spent / limit) * 100), 100);
}

function resolveCategorySpent(
  spentMap: Map<string, number>,
  category: string,
) {
  const live = spentMap.get(category) ?? 0;
  if (live > 0) return live;
  return moneyBudgetSpendingFallback[category] ?? 0;
}

export function MoneyBudgetsPanel({ transactions }: MoneyBudgetsPanelProps) {
  const spentMap = useMemo(
    () => spendingByCategory(transactions),
    [transactions],
  );

  const displayBudgets = useMemo(
    () =>
      categoryBudgets
        .filter((b) =>
          [
            "Groceries",
            "Dining",
            "Transport",
            "Shopping",
            "Subscriptions",
            "Utilities",
          ].includes(b.category),
        )
        .map((budget) => {
          const spent = resolveCategorySpent(spentMap, budget.category);
          return { ...budget, spent };
        }),
    [spentMap],
  );

  const overallRemaining = useMemo(() => {
    const totalSpent = displayBudgets.reduce((sum, b) => sum + b.spent, 0);
    const budget = monthlySpending.budget;
    return Math.max(budget - totalSpent, 0);
  }, [displayBudgets]);

  return (
    <SectionPanel title="Budgets">
      <ul className="flex flex-col gap-5">
        {displayBudgets.map((budget) => {
          const pct = budgetPercent(budget.spent, budget.limit);
          const needsAttention = budget.spent > budget.limit;

          return (
            <ProgressRow
              key={budget.category}
              label={budget.category}
              percent={pct}
              needsAttention={needsAttention}
              valueLabel={formatTransactionTotal(budget.spent)}
              limitLabel={formatTransactionTotal(budget.limit)}
              note={
                needsAttention
                  ? buildBudgetCategoryNote(
                      budget.category,
                      budget.spent,
                      budget.limit,
                      overallRemaining,
                    )
                  : undefined
              }
            />
          );
        })}
      </ul>
    </SectionPanel>
  );
}
