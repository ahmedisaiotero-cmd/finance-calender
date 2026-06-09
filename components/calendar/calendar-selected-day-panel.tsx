import type { CapturedSyncItem } from "@/lib/captured-items";
import type { TimelineEvent } from "@/lib/timeline-events";

type CalendarSelectedDayPanelProps = {
  dateLabel: string;
  events: TimelineEvent[];
  capturedItems?: CapturedSyncItem[];
};

export function CalendarSelectedDayPanel({
  dateLabel,
  events,
  capturedItems = [],
}: CalendarSelectedDayPanelProps) {
  const visible = events.slice(0, 5);
  const hasCapturedItems = capturedItems.length > 0;

  return (
    <section className="sync-home-surface sync-calendar-day">
      <header>
        <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
          {dateLabel}
        </h2>
      </header>

      {visible.length === 0 && !hasCapturedItems ? (
        <p className="mt-4 text-[13px] text-muted-foreground/72">
          Nothing important on this day.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {capturedItems.map((item) => (
            <li key={item.id}>
              <p className="text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
                {item.title}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground/68">
                {[item.dateLabel, item.timeLabel]
                  .filter((value) => value && value !== "Flexible")
                  .join(" • ")}
              </p>
            </li>
          ))}
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
