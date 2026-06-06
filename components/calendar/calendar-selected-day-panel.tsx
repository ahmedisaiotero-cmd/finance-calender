import type { TimelineEvent } from "@/lib/timeline-events";

type CalendarSelectedDayPanelProps = {
  dateLabel: string;
  events: TimelineEvent[];
};

export function CalendarSelectedDayPanel({
  dateLabel,
  events,
}: CalendarSelectedDayPanelProps) {
  const visible = events.slice(0, 5);

  return (
    <section className="sync-home-surface sync-calendar-day">
      <header>
        <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
          {dateLabel}
        </h2>
      </header>

      {visible.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground/72">
          Nothing important on this day.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((event) => (
            <li key={event.id}>
              <p className="text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
                {event.title}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
