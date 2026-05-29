import { formatTransactionTotal } from "@/lib/transaction-utils";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { CategoryBudget } from "@/src/data/budgets";
import { cn } from "@/lib/utils";

type BudgetCardProps = {
  budget: CategoryBudget;
  spent: number;
};

export function BudgetCard({ budget, spent }: BudgetCardProps) {
  const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const remaining = Math.max(budget.limit - spent, 0);
  const isOver = spent > budget.limit;

  return (
    <SurfaceCard as="div" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {budget.category}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {formatTransactionTotal(spent)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            of {formatTransactionTotal(budget.limit)} budget
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            isOver
              ? "bg-warning-muted text-warning"
              : "bg-income-muted text-income",
          )}
        >
          {isOver ? "Over" : `${formatTransactionTotal(remaining)} left`}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(Math.min(progress, 100))}% used</span>
          <span>{formatTransactionTotal(budget.limit)} cap</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isOver ? "bg-warning" : "bg-primary",
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </SurfaceCard>
  );
}
