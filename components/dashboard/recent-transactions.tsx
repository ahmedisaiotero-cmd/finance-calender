"use client";

import Link from "next/link";

import { TransactionList } from "@/components/transaction-list";
import { useTransactions } from "@/hooks/use-transactions";
import { cn } from "@/lib/utils";

export function RecentTransactions({ className }: { className?: string }) {
  const { transactions, ready } = useTransactions();
  const recent = transactions.slice(0, 6);

  return (
    <section
      className={cn(
        "rounded-3xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Recent transactions
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Synced with your finance calendar
          </p>
        </div>
        <Link
          href="/calendar#transactions"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {ready ? (
        <TransactionList transactions={recent} />
      ) : (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      )}
    </section>
  );
}
