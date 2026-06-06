import { formatTransactionTotal } from "@/lib/transaction-utils";
import { SummaryBar, SummaryDivider, SummaryStat } from "@/components/sync";

type MoneySnapshotProps = {
  monthName: string;
  spent: number;
  budget: number;
};

export function MoneySnapshot({ monthName, spent, budget }: MoneySnapshotProps) {
  const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const remaining = Math.max(budget - spent, 0);

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
        {monthName} Snapshot
      </p>
      <SummaryBar>
        <SummaryStat>{formatTransactionTotal(spent)} spent</SummaryStat>
        <SummaryDivider />
        <SummaryStat>{formatTransactionTotal(budget)} budget</SummaryStat>
        <SummaryDivider />
        <SummaryStat>{percentUsed}% used</SummaryStat>
        <SummaryDivider />
        <SummaryStat highlight>{formatTransactionTotal(remaining)} remaining</SummaryStat>
      </SummaryBar>
    </div>
  );
}
