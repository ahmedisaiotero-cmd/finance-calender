import { SummaryBar, SummaryDivider, SummaryStat } from "@/components/sync";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type HomeSummaryBarProps = {
  spent: number;
  monthLabel: string;
  activeDays: number;
  goalDays: number;
  tasksDue: number;
};

/** @deprecated Use SummaryBar inline in SyncDashboard */
export function HomeSummaryBar({
  spent,
  monthLabel,
  activeDays,
  goalDays,
  tasksDue,
}: HomeSummaryBarProps) {
  return (
    <SummaryBar>
      <SummaryStat>
        {formatMoney(spent)} spent · {monthLabel}
      </SummaryStat>
      <SummaryDivider />
      <SummaryStat>
        {activeDays}/{goalDays} activities
      </SummaryStat>
      <SummaryDivider />
      <SummaryStat highlight>
        {tasksDue} career {tasksDue === 1 ? "focus" : "focus areas"}
      </SummaryStat>
    </SummaryBar>
  );
}
