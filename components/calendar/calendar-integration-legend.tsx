import type { CalendarLens } from "@/lib/timeline-events";

type CalendarIntegrationLegendProps = {
  lens: CalendarLens;
};

export function CalendarIntegrationLegend({
  lens,
}: CalendarIntegrationLegendProps) {
  if (lens === "money") return null;

  const showMoney = lens === "all";
  const showHealth = lens === "all" || lens === "health";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/50">
      {showMoney && <span className="text-muted-foreground/60">Money</span>}
      {showHealth && <span className="text-income/65">Health</span>}
    </div>
  );
}
