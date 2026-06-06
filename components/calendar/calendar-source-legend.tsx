import { calendarSourceLabels } from "@/lib/calendar-constants";
import type { CalendarEventSource } from "@/src/data/calendar-events";

export function CalendarSourceLegend() {
  return (
    <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/50">
      {(Object.entries(calendarSourceLabels) as [CalendarEventSource, string][]).map(
        ([key, label]) => (
          <span key={key}>
            {label}
            {key === "recurring" && " · monthly"}
          </span>
        ),
      )}
    </div>
  );
}
