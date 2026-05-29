import { TransactionList } from "@/components/transaction-list";
import { recentTransactions } from "@/src/data/transactions";
import { cn } from "@/lib/utils";

export function RecentTransactions({ className }: { className?: string }) {
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
            Last 7 days across all accounts
          </p>
        </div>
        <a
          href="#"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </a>
      </div>

      <TransactionList transactions={recentTransactions} />
    </section>
  );
}
