"use client";

import type { CapturedSyncItem } from "@/lib/captured-items";
import type { TimelineEvent } from "@/lib/timeline-events";
import { cn } from "@/lib/utils";

type CalendarSelectedDayPanelProps = {
  dateLabel: string;
  events: TimelineEvent[];
  onSelectEvent?: (event: TimelineEvent) => void;
  selectedEventId?: string | null;
};

function eventTimeLabel(event: TimelineEvent) {
  if (event.isAllDay) return "All day";
  return event.detail?.time ?? "";
}

export function CalendarSelectedDayPanel({
  dateLabel,
  events,
  onSelectEvent,
  selectedEventId,
}: CalendarSelectedDayPanelProps) {
  const visible = events.slice(0, 8);

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
        <ul className="mt-4 flex flex-col gap-2">
          {visible.map((event) => {
            const time = eventTimeLabel(event);
            const isSelected = selectedEventId === event.id;

            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent?.(event)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? "border-primary/25 bg-primary/8"
                      : "border-border/20 bg-background/20 hover:bg-muted/15",
                  )}
                >
                  {time && (
                    <p className="text-[12px] font-medium text-muted-foreground/62">
                      {time}
                    </p>
                  )}
                  <p className="text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
                    {event.title}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function findCaptureForEvent(
  event: TimelineEvent,
  items: CapturedSyncItem[],
): CapturedSyncItem | null {
  if (!event.captureId) return null;
  return items.find((item) => item.id === event.captureId) ?? null;
}
