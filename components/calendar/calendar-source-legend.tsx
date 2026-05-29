import { calendarSourceLabels } from "@/lib/calendar-constants";
import type { CalendarEventSource } from "@/src/data/calendar-events";

export function CalendarSourceLegend() {
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
      {(Object.entries(calendarSourceLabels) as [CalendarEventSource, string][]).map(
        ([key, label]) => (
          <span
            key={key}
            className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1"
          >
            {label}
            {key === "recurring" && " · monthly"}
          </span>
        ),
      )}
    </div>
  );
}
