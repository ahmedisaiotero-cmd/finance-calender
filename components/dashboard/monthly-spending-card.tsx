import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { monthlySpending } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MonthlySpendingCard({ className }: { className?: string }) {
  const { spent, budget, vsLastMonthPercent, monthLabel } = monthlySpending;
  const progress = Math.min((spent / budget) * 100, 100);
  const remaining = Math.max(budget - spent, 0);
  const isUnderLastMonth = vsLastMonthPercent < 0;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-8",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/5 blur-3xl" />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full blur-3xl"
        style={{ backgroundColor: "var(--glow)" }}
      />

      <div className="relative flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Monthly spending
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">{monthLabel}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              isUnderLastMonth
                ? "bg-income-muted text-income"
                : "bg-warning-muted text-warning",
            )}
          >
            {isUnderLastMonth ? (
              <ArrowDownRight className="size-3.5" />
            ) : (
              <ArrowUpRight className="size-3.5" />
            )}
            {Math.abs(vsLastMonthPercent)}% vs last month
          </span>
        </div>

        <div>
          <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {formatCurrency(spent)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            of {formatCurrency(budget)} budget ·{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(remaining)} left
            </span>
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}% used</span>
            <span>{formatCurrency(budget)} cap</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(to right, var(--progress-from), var(--progress-to))`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-5">
          {[
            { label: "Daily avg", value: "$94" },
            { label: "Largest", value: "$325" },
            { label: "Categories", value: "8" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-muted/50 px-3 py-2.5 text-center sm:text-left"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
