import type { ReactNode } from "react";

import { todayHealthTrackers } from "@/components/health/health-mock-data";
import { CategoryPill, EmptyState } from "@/components/sync";
import { formatCurrency } from "@/lib/calendar-utils";
import type { TimelineEvent } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

type CalendarSelectedDayPanelProps = {
  dateLabel: string;
  events: TimelineEvent[];
  showTodayTrackers?: boolean;
};

function moneyAmount(event: TimelineEvent) {
  const amount = event.amount ?? 0;
  const formatted = formatCurrency(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : formatted;
}

function CategoryGroup({
  category,
  children,
}: {
  category: "health" | "money" | "career" | "personal";
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <CategoryPill category={category} />
      </div>
      <ul className="flex flex-col gap-5">{children}</ul>
    </div>
  );
}

export function CalendarSelectedDayPanel({
  dateLabel,
  events,
  showTodayTrackers = false,
}: CalendarSelectedDayPanelProps) {
  const healthEvents = events.filter((e) => e.lifeCategory === "health");
  const moneyEvents = events.filter((e) => e.lifeCategory === "money");
  const otherEvents = events.filter(
    (e) =>
      e.lifeCategory === "career" ||
      e.lifeCategory === "personal" ||
      e.lifeCategory === "relationships",
  );
  const protein = todayHealthTrackers.find((t) => t.label === "Protein");

  const hasTrackers = showTodayTrackers && protein != null;
  const hasContent =
    healthEvents.length > 0 ||
    moneyEvents.length > 0 ||
    otherEvents.length > 0 ||
    hasTrackers;

  return (
    <aside className="lg:sticky lg:top-8 lg:self-start" data-panel="selected-day">
      <section className="rounded-lg border border-border/35 px-5 py-6 sm:px-6 sm:py-7">
        <header className="mb-6 border-b border-border/25 pb-5">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
            Selected Day
          </h2>
          <p className="mt-1.5 text-[16px] font-medium tracking-[-0.02em] text-foreground/90">
            {dateLabel}
          </p>
        </header>

        {!hasContent ? (
          <EmptyState message="Nothing on your timeline for this day." />
        ) : (
          <div className="flex flex-col gap-8">
            {healthEvents.length > 0 && (
              <CategoryGroup category="health">
                {healthEvents.map((event) => (
                  <li key={event.id}>
                    <p className="text-[15px] tracking-[-0.01em] text-foreground/90">
                      {event.title}
                    </p>
                    {event.durationMinutes != null && (
                      <p className="mt-1 text-[12px] text-muted-foreground/55">
                        {event.durationMinutes} min
                      </p>
                    )}
                  </li>
                ))}
              </CategoryGroup>
            )}

            {moneyEvents.length > 0 && (
              <CategoryGroup category="money">
                {moneyEvents.map((event) => (
                  <li key={event.id}>
                    <p className="text-[15px] tracking-[-0.01em] text-foreground/90">
                      {event.title}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[13px] tabular-nums",
                        (event.amount ?? 0) >= 0
                          ? "text-income/75"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {moneyAmount(event)}
                    </p>
                  </li>
                ))}
              </CategoryGroup>
            )}

            {otherEvents.length > 0 && (
              <CategoryGroup
                category={
                  otherEvents[0].lifeCategory === "career" ? "career" : "personal"
                }
              >
                {otherEvents.map((event) => (
                  <li key={event.id}>
                    <p className="text-[15px] tracking-[-0.01em] text-foreground/90">
                      {event.title}
                    </p>
                  </li>
                ))}
              </CategoryGroup>
            )}

            {hasTrackers && (
              <CategoryGroup category="health">
                <li>
                  <p className="text-[15px] tracking-[-0.01em] text-foreground/90">
                    Protein Goal
                  </p>
                  <p className="mt-1 text-[12px] tabular-nums text-muted-foreground/55">
                    {protein.current} / {protein.target}
                    {protein.unit === "g" ? "g" : ` ${protein.unit}`}
                  </p>
                </li>
              </CategoryGroup>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}
