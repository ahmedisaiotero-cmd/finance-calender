import type { FinanceGoalImpact } from "@/components/finance/finance-mock-data";

type FinanceGoalsImpactProps = {
  goals: FinanceGoalImpact[];
};

export function FinanceGoalsImpact({ goals }: FinanceGoalsImpactProps) {
  return (
    <section className="sync-home-surface sync-finance-card">
      <h2 className="sync-finance-card-title">Goals impact</h2>

      <ul className="mt-3.5 flex flex-col gap-2.5">
        {goals.map((goal) => (
          <li
            key={goal.id}
            className="flex items-baseline justify-between gap-4 text-[13px]"
          >
            <span className="text-foreground/85">{goal.name}</span>
            <span className="shrink-0 text-[12px] text-muted-foreground/74 sync-finance-value--positive">
              {goal.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
