"use client";

import { useMemo, useState } from "react";

import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards";
import { TransactionList } from "@/components/transaction-list";
import { SurfaceCard } from "@/components/ui/surface-card";
import { getTransactionCategories } from "@/lib/transaction-utils";
import type { Transaction } from "@/src/data/transactions";
import { cn } from "@/lib/utils";

type TransactionsContentProps = {
  transactions: Transaction[];
};

export function TransactionsContent({ transactions }: TransactionsContentProps) {
  const categories = useMemo(
    () => getTransactionCategories(transactions),
    [transactions],
  );
  const [category, setCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    if (category === "All") return transactions;
    return transactions.filter((tx) => tx.category === category);
  }, [transactions, category]);

  return (
    <div className="space-y-6">
      <TransactionSummaryCards transactions={transactions} />

      <SurfaceCard>
        <div className="flex flex-col gap-4 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              All transactions
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {filtered.length} of {transactions.length} shown
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", ...categories].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  category === item
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <TransactionList
          transactions={filtered}
          emptyMessage="No transactions in this category."
        />
      </SurfaceCard>
    </div>
  );
}
