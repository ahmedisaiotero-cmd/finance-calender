"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarPageHeader } from "@/components/calendar/calendar-page-header";
import { CalendarSelectedDayPanel } from "@/components/calendar/calendar-selected-day-panel";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { Pulse } from "@/components/sync";
import { SYNC_LOADING_LABEL } from "@/lib/sync-copy";
import { buildCalendarPulse } from "@/lib/sync-pulse";
import { useStableNow } from "@/hooks/use-stable-now";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { useTransactions } from "@/hooks/use-transactions";
import {
  getCalendarCells,
  getMonthLabel,
  getUniqueMonthsFromCells,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";
import { getItemsForDate, itemToTimelineEvent } from "@/lib/sync-timeline";
import { buildUnifiedTimeline } from "@/lib/unified-timeline";
import { groupTimelineByDate } from "@/lib/timeline-events";

type FinanceCalendarContentProps = {
  initialYear?: number;
  initialMonth?: number;
};

function adjacentMonth(year: number, month: number, delta: number) {
  return new Date(year, month + delta, 1);
}

export function FinanceCalendarContent({
  initialYear,
  initialMonth,
}: FinanceCalendarContentProps) {
  const { transactions, ready, usingDatabase } = useTransactions();
  const now = useStableNow();
  const todayKey = toDateKey(now);
  const [viewAnchor, setViewAnchor] = useState(
    () =>
      new Date(
        initialYear ?? now.getFullYear(),
        initialMonth ?? now.getMonth(),
        1,
      ),
  );
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const viewYear = viewAnchor.getFullYear();
  const viewMonth = viewAnchor.getMonth();
  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );
  const monthLabel = useMemo(
    () => getMonthLabel(viewYear, viewMonth),
    [viewYear, viewMonth],
  );
  const monthsInView = useMemo(
    () => getUniqueMonthsFromCells(cells),
    [cells],
  );

  const prevMonth = adjacentMonth(viewYear, viewMonth, -1);
  const nextMonth = adjacentMonth(viewYear, viewMonth, 1);

  const { events: currentMoneyEvents, ready: currentEventsReady } =
    useCalendarEvents(
      viewYear,
      viewMonth,
      transactions,
      usingDatabase,
    );

  const { events: prevMoneyEvents, ready: prevEventsReady } = useCalendarEvents(
    prevMonth.getFullYear(),
    prevMonth.getMonth(),
    transactions,
    usingDatabase,
  );

  const { events: nextMoneyEvents, ready: nextEventsReady } = useCalendarEvents(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    transactions,
    usingDatabase,
  );

  const moneyEvents = useMemo(
    () => [...prevMoneyEvents, ...currentMoneyEvents, ...nextMoneyEvents],
    [prevMoneyEvents, currentMoneyEvents, nextMoneyEvents],
  );

  const eventsReady = currentEventsReady && prevEventsReady && nextEventsReady;

  const {
    timeline: currentMonthTimeline,
    ready: syncTimelineReady,
    usingLiveTimeline,
  } = useSyncTimeline(viewYear, viewMonth);

  const mergedTimeline = useMemo(() => {
    if (usingLiveTimeline) {
      return currentMonthTimeline;
    }

    return monthsInView.flatMap(({ year, month }) => {
      const monthMoney = moneyEvents.filter((event) => {
        const [y, m] = event.date.split("-").map(Number);
        return y === year && m - 1 === month;
      });
      return buildUnifiedTimeline(monthMoney, year, month, { reference: now });
    });
  }, [
    moneyEvents,
    monthsInView,
    now,
    usingLiveTimeline,
    currentMonthTimeline,
  ]);

  const timelineByDate = useMemo(
    () => groupTimelineByDate(mergedTimeline),
    [mergedTimeline],
  );

  const selectedEvents = useMemo(() => {
    const live = timelineByDate.get(selectedKey) ?? [];
    if (live.length > 0 || usingLiveTimeline) return live;
    return getItemsForDate(selectedKey, now).map(itemToTimelineEvent);
  }, [timelineByDate, selectedKey, now, usingLiveTimeline]);
  const selectedLabel = parseDateKey(selectedKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const calendarPulse = useMemo(
    () =>
      buildCalendarPulse({
        selectedDayEventCount: selectedEvents.length,
        isToday: selectedKey === todayKey,
        hasMoneyOnDay: selectedEvents.some((e) => e.lifeCategory === "money"),
        weekAheadBusy:
          mergedTimeline.filter((e) => e.date >= todayKey).slice(0, 14)
            .length >= 8,
      }),
    [selectedEvents, selectedKey, todayKey, mergedTimeline],
  );

  const redirectLegacyMoneyHash = useCallback(() => {
    const hash = window.location.hash;
    if (hash === "#transactions" || hash === "#budgets") {
      window.location.replace("/finance");
    }
  }, []);

  useEffect(() => {
    redirectLegacyMoneyHash();
    window.addEventListener("hashchange", redirectLegacyMoneyHash);
    return () => window.removeEventListener("hashchange", redirectLegacyMoneyHash);
  }, [redirectLegacyMoneyHash]);

  function shiftMonth(delta: number) {
    setViewAnchor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  function goToToday() {
    const today = new Date();
    setViewAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(toDateKey(today));
  }

  if (!ready || !eventsReady || !syncTimelineReady) {
    return (
      <p className="text-[13px] text-muted-foreground">{SYNC_LOADING_LABEL}</p>
    );
  }

  return (
    <div className="sync-calendar-page" data-page="calendar">
      <header className="sync-briefing">
        <CalendarPageHeader />
        <Pulse
          state={calendarPulse.state}
          title={calendarPulse.title}
          message={calendarPulse.message}
          contributingSignals={calendarPulse.contributingSignals}
        />
      </header>

      <div className="sync-calendar-grid">
        <section className="sync-home-surface min-w-0 px-3 py-4 sm:px-4 sm:py-5">
          <CalendarToolbar
            monthLabel={monthLabel}
            variant="month"
            lens="all"
            onPrevious={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
            onToday={goToToday}
          />
          <CalendarGrid
            cells={cells}
            eventsByDate={timelineByDate}
            selectedKey={selectedKey}
            onSelectDay={setSelectedKey}
          />
        </section>

        <CalendarSelectedDayPanel
          dateLabel={selectedLabel}
          events={selectedEvents}
        />
      </div>
    </div>
  );
}
