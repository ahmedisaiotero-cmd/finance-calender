"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { CalendarSelectedDayPanel } from "@/components/calendar/calendar-selected-day-panel";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildCalendarMonthView } from "@/lib/calendar-time-blocks";
import { CALENDAR_WEEKDAYS_SHORT } from "@/lib/calendar-constants";
import {
  getCalendarCells,
  getMonthLabel,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";
import { formatSyncTimeBlockCellLabel } from "@/lib/sync-time-blocks";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";
import { cn } from "@/lib/utils";

type SyncCalendarGridProps = {
  items: CapturedSyncItem[];
  month?: Date;
};

function eventCellLabel(
  block: ReturnType<typeof buildCalendarMonthView>["blocks"][number],
) {
  return formatSyncTimeBlockCellLabel(block);
}

function adjacentMonth(year: number, month: number, delta: number) {
  return new Date(year, month + delta, 1);
}

export function SyncCalendarGrid({ items, month }: SyncCalendarGridProps) {
  const reference = month ?? new Date();
  const [viewAnchor, setViewAnchor] = useState(
    () => new Date(reference.getFullYear(), reference.getMonth(), 1),
  );
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(reference));

  const monthView = useMemo(() => {
    const workSchedule = loadActiveWorkSchedule();
    return buildCalendarMonthView({
      items,
      year: viewAnchor.getFullYear(),
      month: viewAnchor.getMonth(),
      reference,
      workSchedule,
    });
  }, [items, reference, viewAnchor]);

  const eventsByDate = monthView.eventsByDate;
  const blocksByDate = useMemo(() => {
    const map = new Map<string, typeof monthView.blocks>();
    for (const block of monthView.blocks) {
      const list = map.get(block.date) ?? [];
      list.push(block);
      map.set(block.date, list);
    }
    return map;
  }, [monthView.blocks]);

  const viewYear = viewAnchor.getFullYear();
  const viewMonth = viewAnchor.getMonth();
  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );
  const weeks = useMemo(() => {
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [cells]);

  const selectedEvents = eventsByDate.get(selectedKey) ?? [];
  const selectedLabel = parseDateKey(selectedKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium tracking-[-0.02em] text-foreground/88">
          {getMonthLabel(viewYear, viewMonth)}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setViewAnchor((current) =>
                adjacentMonth(
                  current.getFullYear(),
                  current.getMonth(),
                  -1,
                ),
              )
            }
            className="rounded-full border border-border/25 p-1.5 text-muted-foreground/70 hover:bg-muted/20 hover:text-foreground/80"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setViewAnchor((current) =>
                adjacentMonth(
                  current.getFullYear(),
                  current.getMonth(),
                  1,
                ),
              )
            }
            className="rounded-full border border-border/25 p-1.5 text-muted-foreground/70 hover:bg-muted/20 hover:text-foreground/80"
          >
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/20 bg-card/20">
        <div className="grid grid-cols-7 border-b border-border/15 bg-muted/10">
          {CALENDAR_WEEKDAYS_SHORT.map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/55"
            >
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-cols-7 border-b border-border/10 last:border-b-0"
          >
            {week.map((cell) => {
              const dayBlocks = blocksByDate.get(cell.dateKey) ?? [];
              const isSelected = cell.dateKey === selectedKey;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => setSelectedKey(cell.dateKey)}
                  aria-pressed={isSelected}
                  className={cn(
                    "min-h-[5.5rem] border-r border-border/10 p-2 text-left last:border-r-0 sm:min-h-[6.25rem]",
                    !cell.isCurrentMonth && "bg-muted/5 opacity-50",
                    isSelected && "bg-primary/6 ring-1 ring-inset ring-primary/15",
                    !isSelected && "hover:bg-muted/10",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-[12px] font-medium tabular-nums",
                      cell.isToday && "bg-[#ff3b30] text-white",
                      !cell.isToday && "text-foreground/85",
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayBlocks.slice(0, 3).map((block) => (
                      <p
                        key={block.id}
                        className="truncate text-[10px] leading-snug text-muted-foreground/78 sm:text-[11px]"
                      >
                        {eventCellLabel(block)}
                      </p>
                    ))}
                    {dayBlocks.length > 3 && (
                      <p className="text-[10px] text-muted-foreground/55">
                        +{dayBlocks.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <CalendarSelectedDayPanel
          dateLabel={selectedLabel}
          events={selectedEvents}
        />
      </div>
    </section>
  );
}
