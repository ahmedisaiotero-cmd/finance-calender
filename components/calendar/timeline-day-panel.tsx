import { CategoryLabel } from "@/components/dashboard/category-label";
import { formatCurrency } from "@/lib/calendar-utils";
import { calendarSourceLabels } from "@/lib/calendar-constants";
import { healthSourceLabels } from "@/lib/health-constants";
import type { TimelineEvent } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

type TimelineDayPanelProps = {
  dateLabel: string;
  events: TimelineEvent[];
  lens: "all" | "money" | "health";
};

export function TimelineDayPanel({
  dateLabel,
  events,
  lens,
}: TimelineDayPanelProps) {
  const moneyTotal = events
    .filter((e) => e.lifeCategory === "money" && e.amount != null)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);

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
            ? "Nothing on your timeline"
            : `${events.length} on your timeline`}
        </p>
      </header>

      {events.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/55">
          {lens === "health"
            ? "No health events this day."
            : "Select a day with activity on the calendar."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {events.map((event, index) => (
            <TimelineEventRow
              key={event.id}
              event={event}
              showDivider={index > 0}
            />
          ))}
        </ul>
      )}

      {moneyTotal !== 0 && events.some((e) => e.lifeCategory === "money") && (
        <p className="mt-4 text-[11px] tabular-nums text-muted-foreground/60">
          Money total{" "}
          <span className="text-foreground/80">{formatCurrency(moneyTotal)}</span>
        </p>
      )}
    </section>
  );
}

function TimelineEventRow({
  event,
  showDivider,
}: {
  event: TimelineEvent;
  showDivider: boolean;
}) {
  const isMoney = event.lifeCategory === "money";
  const amount = event.amount ?? 0;
  const sourceLabel = isMoney
    ? calendarSourceLabels[event.source as keyof typeof calendarSourceLabels]
    : healthSourceLabels[event.source as keyof typeof healthSourceLabels];

  return (
    <li
      className={cn(
        "grid items-baseline gap-x-5 gap-y-0.5 py-3.5 sm:grid-cols-[1fr_auto]",
        showDivider && "border-t border-border/25",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[13px] tracking-[-0.01em] text-foreground/85">
            {event.title}
          </p>
          <CategoryLabel category={event.lifeCategory} />
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground/55">
          {event.category}
          <span className="mx-1.5 text-border/60">·</span>
          {sourceLabel}
          {!isMoney && event.durationMinutes != null && (
            <>
              <span className="mx-1.5 text-border/60">·</span>
              {event.durationMinutes} min
            </>
          )}
        </p>
      </div>

      {isMoney && (
        <span
          className={cn(
            "text-[13px] font-medium tabular-nums",
            amount >= 0 ? "text-income/75" : "text-foreground/80",
          )}
        >
          {formatCurrency(amount)}
        </span>
      )}
    </li>
  );
}
