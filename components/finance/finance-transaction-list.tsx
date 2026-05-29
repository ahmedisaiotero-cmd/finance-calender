"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { TransactionList } from "@/components/transaction-list";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  filterTransactions,
  filterTransactionsForDay,
  getTransactionCategories,
  sortTransactions,
  type SortOption,
} from "@/lib/transaction-utils";
import type { Transaction } from "@/src/data/transactions";
import { cn } from "@/lib/utils";

const sortLabels: Record<SortOption, string> = {
  "date-desc": "Newest first",
  "date-asc": "Oldest first",
  "amount-desc": "Highest amount",
  "amount-asc": "Lowest amount",
  "name-asc": "Name A–Z",
};

type FinanceTransactionListProps = {
  transactions: Transaction[];
  selectedDateKey?: string | null;
  monthLabel: string;
};

export function FinanceTransactionList({
  transactions,
  selectedDateKey,
  monthLabel,
}: FinanceTransactionListProps) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("date-desc");
  const [dayOnly, setDayOnly] = useState(false);

  const categories = useMemo(
    () => getTransactionCategories(transactions),
    [transactions],
  );

  const baseList = useMemo(() => {
    if (dayOnly && selectedDateKey) {
      return filterTransactionsForDay(transactions, selectedDateKey);
    }
    return transactions;
  }, [transactions, selectedDateKey, dayOnly]);

  const filtered = useMemo(() => {
    const matched = filterTransactions(baseList, query, category);
    return sortTransactions(matched, sort);
  }, [baseList, query, category, sort]);

  return (
    <section id="transactions" className="scroll-mt-8">
      <SurfaceCard>
        <div className="space-y-4 border-b border-border/60 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Transactions
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {filtered.length} shown · {monthLabel}
                {dayOnly && selectedDateKey ? " · selected day" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-full border border-border/60 bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 sm:w-52"
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

          <div className="flex flex-wrap items-center gap-2">
            {selectedDateKey && (
              <button
                type="button"
                onClick={() => setDayOnly((prev) => !prev)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  dayOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                Selected day only
              </button>
            )}
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
          emptyMessage="No transactions for this view."
        />
      </SurfaceCard>
    </section>
  );
}
