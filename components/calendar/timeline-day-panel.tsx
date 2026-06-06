import { formatCurrency } from "@/lib/calendar-utils";
import { calendarSourceLabels } from "@/lib/calendar-constants";
import { healthSourceLabels } from "@/lib/health-constants";
import type { TimelineEvent } from "@/lib/timeline-events";
import { SurfaceCard } from "@/components/ui/surface-card";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<TimelineEvent["lifeCategory"], string> = {
  money: "Money",
  health: "Health",
  career: "Career",
  relationships: "Relationships",
  personal: "Personal",
};

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
    <SurfaceCard as="aside" className="lg:col-span-2">
      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <h3 className="text-lg font-semibold tracking-tight">{dateLabel}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {events.length === 0
            ? "Nothing on your timeline"
            : `${events.length} on your timeline`}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
          {lens === "health"
            ? "No health events this day. Open the Health category page for the full training calendar."
            : "Select a day with activity or add a Money transaction below."}
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {events.map((event) => (
            <TimelineEventRow key={event.id} event={event} />
          ))}
        </ul>
      )}

      {moneyTotal !== 0 && events.some((e) => e.lifeCategory === "money") && (
        <div className="border-t border-border/60 px-5 py-4 sm:px-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Money total</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(moneyTotal)}
            </span>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const isMoney = event.lifeCategory === "money";
  const amount = event.amount ?? 0;

  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              isMoney
                ? "bg-expense-muted text-foreground"
                : "bg-income-muted text-income",
            )}
          >
            {CATEGORY_LABELS[event.lifeCategory]}
          </span>
          <p className="truncate font-medium">{event.title}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {event.category}
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="text-xs">
            {isMoney
              ? calendarSourceLabels[
                  event.source as keyof typeof calendarSourceLabels
                ]
              : healthSourceLabels[
                  event.source as keyof typeof healthSourceLabels
                ]}
          </span>
          {!isMoney && event.durationMinutes != null && (
            <>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className="text-xs">{event.durationMinutes} min</span>
            </>
          )}
        </p>
      </div>
      {isMoney && (
        <p
          className={cn(
            "shrink-0 font-semibold tabular-nums",
            amount >= 0 ? "text-income" : "text-foreground",
          )}
        >
          {formatCurrency(amount)}
        </p>
      )}
    </li>
  );
}
