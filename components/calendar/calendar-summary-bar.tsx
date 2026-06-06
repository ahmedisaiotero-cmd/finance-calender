import { SummaryBar, SummaryDivider, SummaryStat } from "@/components/sync";

type CalendarSummaryBarProps = {
  timelineItems: number;
  spent: string;
  activeHours: number;
  consistency: number;
};

export function CalendarSummaryBar({
  timelineItems,
  spent,
  activeHours,
  consistency,
}: CalendarSummaryBarProps) {
  return (
    <SummaryBar>
      <SummaryStat>
        {timelineItems} timeline {timelineItems === 1 ? "item" : "items"}
      </SummaryStat>
      <SummaryDivider />
      <SummaryStat>{spent} spent</SummaryStat>
      <SummaryDivider />
      <SummaryStat>{activeHours}h active</SummaryStat>
      <SummaryDivider />
      <SummaryStat highlight>{consistency}% consistency</SummaryStat>
    </SummaryBar>
  );
}
