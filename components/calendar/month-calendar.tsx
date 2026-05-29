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
  getCalendarCells,
  getMonthLabel,
  groupEventsByDate,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";

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
  const [viewYear, setViewYear] = useState(initialYear ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ?? now.getMonth());
  const [selectedKey, setSelectedKey] = useState(toDateKey(now));

  const events = useMemo(
    () =>
      getCalendarEventsForMonth(viewYear, viewMonth, { transactions }),
    [viewYear, viewMonth, transactions],
  );

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedEvents = eventsByDate.get(selectedKey) ?? [];
  const selectedLabel = parseDateKey(selectedKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToToday() {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedKey(toDateKey(today));
  }

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground">Loading calendar…</p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
      <SurfaceCard className="p-4 sm:p-6 lg:col-span-3">
        <CalendarSourceLegend />
        <CalendarToolbar
          monthLabel={getMonthLabel(viewYear, viewMonth)}
          onPrevious={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          onToday={goToToday}
        />
        <CalendarGrid
          cells={cells}
          eventsByDate={eventsByDate}
          selectedKey={selectedKey}
          onSelectDay={setSelectedKey}
        />
      </SurfaceCard>

      <CalendarDayPanel dateLabel={selectedLabel} events={selectedEvents} />
    </div>
  );
}
