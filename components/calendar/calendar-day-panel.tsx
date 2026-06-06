import { formatCurrency } from "@/lib/calendar-utils";
import { calendarSourceLabels } from "@/lib/calendar-constants";
import type { CalendarEvent } from "@/src/data/calendar-events";
import { cn } from "@/lib/utils";

type CalendarDayPanelProps = {
  dateLabel: string;
  events: CalendarEvent[];
};

export function CalendarDayPanel({ dateLabel, events }: CalendarDayPanelProps) {
  const dayTotal = events.reduce((sum, event) => sum + event.amount, 0);

  return (
    <section>
      <header className="mb-5">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
          Selected day
        </h2>
        <p className="mt-1.5 text-[13px] tracking-[-0.01em] text-foreground/80">
          {dateLabel}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/55">
          {events.length === 0
            ? "No events scheduled"
            : `${events.length} event${events.length === 1 ? "" : "s"}`}
        </p>
      </header>

      {events.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/55">
          Select a day with activity on the calendar.
        </p>
      ) : (
        <ul className="flex flex-col">
          {events.map((event, index) => (
            <CalendarEventRow
              key={event.id}
              event={event}
              showDivider={index > 0}
            />
          ))}
        </ul>
      )}

      {events.length > 0 && (
        <p className="mt-4 text-[11px] tabular-nums text-muted-foreground/60">
          Day total{" "}
          <span className="text-foreground/80">{formatCurrency(dayTotal)}</span>
        </p>
      )}
    </section>
  );
}

function CalendarEventRow({
  event,
  showDivider,
}: {
  event: CalendarEvent;
  showDivider: boolean;
}) {
  const isIncome = event.amount >= 0;

  return (
    <li
      className={cn(
        "grid items-baseline gap-x-5 gap-y-0.5 py-3.5 sm:grid-cols-[1fr_auto]",
        showDivider && "border-t border-border/25",
      )}
    >
      <div className="min-w-0">
        <p className="text-[13px] tracking-[-0.01em] text-foreground/85">
          {event.title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/55">
          {event.category}
          <span className="mx-1.5 text-border/60">·</span>
          {calendarSourceLabels[event.source]}
        </p>
      </div>
      <span
        className={cn(
          "text-[13px] font-medium tabular-nums",
          isIncome ? "text-income/75" : "text-foreground/80",
        )}
      >
        {formatCurrency(event.amount)}
      </span>
    </li>
  );
}
