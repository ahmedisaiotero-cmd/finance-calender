import { formatCurrency } from "@/lib/calendar-utils";
import { calendarSourceLabels } from "@/lib/calendar-constants";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { CalendarEvent } from "@/src/data/calendar-events";
import { cn } from "@/lib/utils";

type CalendarDayPanelProps = {
  dateLabel: string;
  events: CalendarEvent[];
};

export function CalendarDayPanel({ dateLabel, events }: CalendarDayPanelProps) {
  const dayTotal = events.reduce((sum, event) => sum + event.amount, 0);

  return (
    <SurfaceCard as="aside" className="lg:col-span-2">
      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <h3 className="text-lg font-semibold tracking-tight">{dateLabel}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {events.length === 0
            ? "No events scheduled"
            : `${events.length} event${events.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {events.length === 0 ? (
        <CalendarDayPanelEmpty />
      ) : (
        <ul className="divide-y divide-border/60">
          {events.map((event) => (
            <CalendarEventRow key={event.id} event={event} />
          ))}
        </ul>
      )}

      {events.length > 0 && (
        <div className="border-t border-border/60 px-5 py-4 sm:px-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Day total</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(dayTotal)}
            </span>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}

function CalendarEventRow({ event }: { event: CalendarEvent }) {
  const isIncome = event.amount >= 0;

  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="truncate font-medium">{event.title}</p>
        <p className="text-sm text-muted-foreground">
          {event.category}
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="text-xs">{calendarSourceLabels[event.source]}</span>
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          isIncome ? "text-income" : "text-foreground",
        )}
      >
        {formatCurrency(event.amount)}
      </p>
    </li>
  );
}

function CalendarDayPanelEmpty() {
  return (
    <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
      Select a day with activity. Add data in{" "}
      <code className="text-xs">recurring-events.ts</code>,{" "}
      <code className="text-xs">transactions.ts</code>, or{" "}
      <code className="text-xs">calendar-events.ts</code>.
    </p>
  );
}
