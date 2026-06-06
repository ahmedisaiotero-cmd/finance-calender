"use client";

import { useMemo } from "react";

import {
  moneyRecentActivityFallback,
  type MoneyActivityItem,
} from "@/components/money/money-mock-data";
import { SectionEyebrow, TimelineItemRow } from "@/components/sync";
import { sortTransactions } from "@/lib/transaction-utils";
import type { Transaction } from "@/src/data/transactions";
import { cn } from "@/lib/utils";

type MoneyRecentActivityProps = {
  transactions: Transaction[];
};

function formatActivityAmount(amount: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  return amount >= 0 ? `+${formatted}` : `−${formatted}`;
}

function toActivityItems(transactions: Transaction[]): MoneyActivityItem[] {
  return sortTransactions(transactions, "date-desc")
    .slice(0, 6)
    .map((tx) => ({
      id: tx.id,
      name: tx.name,
      amount: tx.amount,
    }));
}

export function MoneyRecentActivity({ transactions }: MoneyRecentActivityProps) {
  const items = useMemo(() => {
    const live = toActivityItems(transactions);
    return live.length > 0 ? live : moneyRecentActivityFallback;
  }, [transactions]);

  return (
    <section>
      <SectionEyebrow title="Recent Activity" />

      <ul className="flex flex-col gap-3.5">
        {items.map((item) => {
          const isIncome = item.amount >= 0;
          return (
            <TimelineItemRow
              key={item.id}
              id={item.id}
              variant="compact"
              title={item.name}
              category="money"
              trailing={
                <span
                  className={cn(
                    "shrink-0 text-[13px] font-medium tabular-nums",
                    isIncome ? "text-income/75" : "text-foreground/80",
                  )}
                >
                  {formatActivityAmount(item.amount)}
                </span>
              }
            />
          );
        })}
      </ul>
    </section>
  );
}
