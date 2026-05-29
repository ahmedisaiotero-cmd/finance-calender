"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards";
import { TransactionList } from "@/components/transaction-list";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useTransactions } from "@/hooks/use-transactions";
import {
  filterTransactions,
  getTransactionCategories,
  sortTransactions,
  type SortOption,
} from "@/lib/transaction-utils";
import { cn } from "@/lib/utils";

const sortLabels: Record<SortOption, string> = {
  "date-desc": "Newest first",
  "date-asc": "Oldest first",
  "amount-desc": "Highest amount",
  "amount-asc": "Lowest amount",
  "name-asc": "Name A–Z",
};

export function TransactionsContent() {
  const { transactions, addTransaction, ready } = useTransactions();
  const categories = useMemo(
    () => getTransactionCategories(transactions),
    [transactions],
  );

  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("date-desc");

  const filtered = useMemo(() => {
    const matched = filterTransactions(transactions, query, category);
    return sortTransactions(matched, sort);
  }, [transactions, query, category, sort]);

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground">Loading transactions…</p>
    );
  }

  return (
    <div className="space-y-6">
      <AddTransactionForm onAdd={addTransaction} />
      <TransactionSummaryCards transactions={transactions} />

      <SurfaceCard>
        <div className="space-y-4 border-b border-border/60 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                All transactions
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {filtered.length} of {transactions.length} shown
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or category…"
                  className="w-full rounded-full border border-border/60 bg-background py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 sm:w-56"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded-full border border-border/60 bg-background px-4 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {(Object.entries(sortLabels) as [SortOption, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
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
          emptyMessage="No transactions match your search."
        />
      </SurfaceCard>
    </div>
  );
}
