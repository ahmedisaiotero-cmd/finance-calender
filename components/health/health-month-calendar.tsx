"use client";

import { useMemo, useState } from "react";

import { HealthCalendarGrid } from "@/components/health/health-calendar-grid";
import { HealthDayPanel } from "@/components/health/health-day-panel";
import { HealthSourceLegend } from "@/components/health/health-source-legend";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { QuickStatCard } from "@/components/dashboard/quick-stat-card";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  getHealthEventsForMonth,
  totalActiveMinutes,
} from "@/lib/build-health-calendar-events";
import { formatDuration } from "@/lib/health-constants";
import {
  getCalendarCells,
  getMonthLabel,
  groupEventsByDate,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";

type HealthMonthCalendarProps = {
  initialYear?: number;
  initialMonth?: number;
};

export function HealthMonthCalendar({
  initialYear,
  initialMonth,
}: HealthMonthCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(initialYear ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ?? now.getMonth());
  const [selectedKey, setSelectedKey] = useState(toDateKey(now));

  const events = useMemo(
    () => getHealthEventsForMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
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

  const workoutDays = eventsByDate.size;
  const totalMinutes = totalActiveMinutes(events);

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickStatCard
          label="Active days"
          value={String(workoutDays)}
          hint={`In ${getMonthLabel(viewYear, viewMonth)}`}
        />
        <QuickStatCard
          label="Total active time"
          value={formatDuration(totalMinutes)}
          hint="Planned + logged"
        />
        <QuickStatCard
          label="Activities"
          value={String(events.length)}
          hint="This month"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <SurfaceCard className="p-4 sm:p-6 lg:col-span-3">
          <HealthSourceLegend />
          <CalendarToolbar
            monthLabel={getMonthLabel(viewYear, viewMonth)}
            onPrevious={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
            onToday={goToToday}
          />
          <HealthCalendarGrid
            cells={cells}
            eventsByDate={eventsByDate}
            selectedKey={selectedKey}
            onSelectDay={setSelectedKey}
          />
        </SurfaceCard>

        <HealthDayPanel dateLabel={selectedLabel} events={selectedEvents} />
      </div>
    </div>
  );
}
