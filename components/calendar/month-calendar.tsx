"use client";

import { useMemo, useState } from "react";

import { CalendarDayPanel } from "@/components/calendar/calendar-day-panel";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarSourceLegend } from "@/components/calendar/calendar-source-legend";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useTransactions } from "@/hooks/use-transactions";
import { getCalendarEventsForMonth } from "@/lib/build-calendar-events";
import {
  getTwoWeekCells,
  getTwoWeekRangeLabel,
  groupEventsByDate,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";
import {
  groupTimelineByDate,
  moneyEventToTimeline,
} from "@/lib/timeline-events";

type MonthCalendarProps = {
  initialYear?: number;
  initialMonth?: number;
};

/** Compact calendar-only view (uses synced transaction store). */
export function MonthCalendar({
  initialYear,
  initialMonth,
}: MonthCalendarProps) {
  const { transactions, ready } = useTransactions();
  const now = new Date();
  const [viewAnchor, setViewAnchor] = useState(
    () => new Date(initialYear ?? now.getFullYear(), initialMonth ?? now.getMonth(), now.getDate()),
  );
  const [selectedKey, setSelectedKey] = useState(toDateKey(now));

  const cells = useMemo(() => getTwoWeekCells(viewAnchor), [viewAnchor]);
  const rangeLabel = useMemo(() => getTwoWeekRangeLabel(cells), [cells]);

  const events = useMemo(() => {
    const months = new Set<string>();
    for (const cell of cells) {
      months.add(`${cell.date.getFullYear()}-${cell.date.getMonth()}`);
    }
    const all = [];
    for (const key of months) {
      const [y, m] = key.split("-").map(Number);
      all.push(...getCalendarEventsForMonth(y, m, { transactions }));
    }
    return all;
  }, [cells, transactions]);

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const timelineByDate = useMemo(
    () => groupTimelineByDate(events.map(moneyEventToTimeline)),
    [events],
  );

  const selectedEvents = eventsByDate.get(selectedKey) ?? [];
  const selectedLabel = parseDateKey(selectedKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function shiftTwoWeeks(delta: number) {
    setViewAnchor((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta * 14);
      return next;
    });
  }

  function goToToday() {
    const today = new Date();
    setViewAnchor(today);
    setSelectedKey(toDateKey(today));
  }

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground">Loading calendar…</p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
      <SurfaceCard className="sync-apple-cal-shell p-4 sm:p-6 lg:col-span-3">
        <CalendarSourceLegend />
        <CalendarToolbar
          monthLabel={rangeLabel}
          variant="two-week"
          onPrevious={() => shiftTwoWeeks(-1)}
          onNext={() => shiftTwoWeeks(1)}
          onToday={goToToday}
        />
        <CalendarGrid
          cells={cells}
          eventsByDate={timelineByDate}
          selectedKey={selectedKey}
          onSelectDay={setSelectedKey}
        />
      </SurfaceCard>

      <CalendarDayPanel dateLabel={selectedLabel} events={selectedEvents} />
    </div>
  );
}
