"use client";

import { useMemo } from "react";

import { MoneyAddTransaction } from "@/components/money/money-add-transaction";
import { MoneyBudgetsPanel } from "@/components/money/money-budgets-panel";
import { MoneyRecentActivity } from "@/components/money/money-recent-activity";
import { MoneyUpcomingPanel } from "@/components/money/money-upcoming-panel";
import { SummaryBar, SummaryDivider, SummaryStat } from "@/components/sync";
import { SYNC_LOADING_LABEL } from "@/lib/sync-copy";
import { buildMoneySnapshotNote } from "@/lib/sync-pulse";
import { monthlySpending } from "@/lib/mock-data";
import {
  filterTransactionsForMonth,
  formatTransactionTotal,
  summarizeTransactions,
} from "@/lib/transaction-utils";
import { categoryBudgets } from "@/src/data/budgets";
import { useTransactions } from "@/hooks/use-transactions";

export function MoneyContent() {
  const { transactions, addTransaction, ready } = useTransactions();
  const now = new Date();
  const viewYear = now.getFullYear();
  const viewMonth = now.getMonth();

  const monthTransactions = useMemo(
    () => filterTransactionsForMonth(transactions, viewYear, viewMonth),
    [transactions, viewYear, viewMonth],
  );

  const monthName = now.toLocaleDateString("en-US", { month: "long" });

  const snapshot = useMemo(() => {
    const { expenses } = summarizeTransactions(monthTransactions);
    const spent =
      expenses > 0 ? Math.round(expenses) : Math.round(monthlySpending.spent);
    const budget =
      monthlySpending.budget ||
      categoryBudgets.reduce((sum, item) => sum + item.limit, 0);
    const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    const remaining = Math.max(budget - spent, 0);

    return { spent, budget, percentUsed, remaining };
  }, [monthTransactions]);

  if (!ready) {
    return (
      <p className="text-[13px] text-muted-foreground">{SYNC_LOADING_LABEL}</p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-10 sm:gap-12" data-page="money">
      <section>
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
          {monthName} Snapshot
        </p>
        <SummaryBar className="mt-2">
          <SummaryStat>{formatTransactionTotal(snapshot.spent)} spent</SummaryStat>
          <SummaryDivider />
          <SummaryStat>{formatTransactionTotal(snapshot.budget)} budget</SummaryStat>
          <SummaryDivider />
          <SummaryStat>{snapshot.percentUsed}% used</SummaryStat>
          <SummaryDivider />
          <SummaryStat highlight>
            {formatTransactionTotal(snapshot.remaining)} remaining
          </SummaryStat>
        </SummaryBar>
        <div
          className="mt-4 h-1 overflow-hidden rounded-full bg-border/50"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-income/60 transition-all"
            style={{ width: `${Math.min(snapshot.percentUsed, 100)}%` }}
          />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/60">
          {buildMoneySnapshotNote(
            snapshot.spent,
            snapshot.budget,
            snapshot.remaining,
          )}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-14 xl:gap-16">
        <div className="flex flex-col gap-10 sm:gap-12">
          <MoneyBudgetsPanel transactions={monthTransactions} />
          <MoneyUpcomingPanel />
        </div>

        <aside className="flex flex-col gap-12 lg:gap-14">
          <MoneyRecentActivity transactions={transactions} />
          <MoneyAddTransaction onAdd={addTransaction} />
        </aside>
      </div>
    </div>
  );
}
