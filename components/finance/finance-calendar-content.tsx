"use client";

import { useMemo, useState } from "react";

import { CalendarEventDetailPanel } from "@/components/calendar/calendar-event-detail-panel";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarPageHeader } from "@/components/calendar/calendar-page-header";
import {
  CalendarSelectedDayPanel,
  findCaptureForEvent,
} from "@/components/calendar/calendar-selected-day-panel";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CategoryLensBar } from "@/components/calendar/category-lens-bar";
import { Pulse } from "@/components/sync";
import { SYNC_LOADING_LABEL } from "@/lib/sync-copy";
import { buildCalendarPulse } from "@/lib/sync-pulse";
import { useStableNow } from "@/hooks/use-stable-now";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { useTransactions } from "@/hooks/use-transactions";
import {
  useCapturedItems,
} from "@/lib/captured-items";
import { capturedItemsToTimelineEvents } from "@/lib/captured-to-timeline";
import {
  getCalendarCells,
  getMonthLabel,
  getUniqueMonthsFromCells,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";
import {
  buildCalendarPulseForecast,
  resolveSelectedDayEvents,
} from "@/lib/calendar-day-events";
import { buildUnifiedTimeline } from "@/lib/unified-timeline";
import {
  filterTimelineByLens,
  groupTimelineByDate,
  type CalendarLens,
  type TimelineEvent,
} from "@/lib/timeline-events";

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
  const {
    activeItems,
    softDeleteCapturedItem,
    duplicateCapturedItem,
    updateCapturedItem,
  } = useCapturedItems();
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
  const [lens, setLens] = useState<CalendarLens>("all");
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

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

  const captureTimelineEvents = useMemo(
    () => capturedItemsToTimelineEvents(activeItems, now),
    [activeItems, now],
  );

  const mergedTimeline = useMemo(() => {
    const base = usingLiveTimeline
      ? currentMonthTimeline
      : monthsInView.flatMap(({ year, month }) => {
          const monthMoney = moneyEvents.filter((event) => {
            const [y, m] = event.date.split("-").map(Number);
            return y === year && m - 1 === month;
          });
          return buildUnifiedTimeline(monthMoney, year, month, { reference: now });
        });

    const combined = [...base, ...captureTimelineEvents];
    return combined.sort((a, b) => a.date.localeCompare(b.date));
  }, [
    moneyEvents,
    monthsInView,
    now,
    usingLiveTimeline,
    currentMonthTimeline,
    captureTimelineEvents,
  ]);

  const filteredTimeline = useMemo(
    () => filterTimelineByLens(mergedTimeline, lens),
    [mergedTimeline, lens],
  );

  const timelineByDate = useMemo(
    () => groupTimelineByDate(filteredTimeline),
    [filteredTimeline],
  );

  const selectedEvents = useMemo(
    () =>
      resolveSelectedDayEvents(
        selectedKey,
        timelineByDate,
        usingLiveTimeline,
        now,
      ),
    [timelineByDate, selectedKey, now, usingLiveTimeline],
  );

  const selectedLabel = parseDateKey(selectedKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const selectedCapture = useMemo(
    () =>
      selectedEvent
        ? findCaptureForEvent(selectedEvent, activeItems)
        : null,
    [selectedEvent, activeItems],
  );

  const calendarPulse = useMemo(
    () =>
      buildCalendarPulse(
        buildCalendarPulseForecast(
          selectedKey,
          todayKey,
          timelineByDate,
          selectedEvents,
        ),
      ),
    [selectedEvents, selectedKey, todayKey, timelineByDate],
  );

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

  function handleSelectDay(dateKey: string) {
    setSelectedKey(dateKey);
    setSelectedEvent(null);
  }

  function handleSelectEvent(event: TimelineEvent) {
    setSelectedEvent(event);
  }

  function handleDeleteCapture() {
    if (!selectedCapture) return;
    softDeleteCapturedItem(selectedCapture.id);
    setSelectedEvent(null);
  }

  function handleDuplicateCapture() {
    if (!selectedCapture) return;
    duplicateCapturedItem(selectedCapture.id);
  }

  function handleSaveCaptureEdit(updates: {
    title: string;
    notes?: string;
  }) {
    if (!selectedCapture) return;
    updateCapturedItem(selectedCapture.id, updates);
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
          <div className="mb-5">
            <CategoryLensBar value={lens} onChange={setLens} />
          </div>
          <CalendarToolbar
            monthLabel={monthLabel}
            variant="month"
            lens={lens}
            onPrevious={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}
            onToday={goToToday}
          />
          <CalendarGrid
            cells={cells}
            eventsByDate={timelineByDate}
            selectedKey={selectedKey}
            onSelectDay={handleSelectDay}
          />
        </section>

        <div className="flex flex-col gap-4">
          <CalendarSelectedDayPanel
            dateLabel={selectedLabel}
            events={selectedEvents}
            onSelectEvent={handleSelectEvent}
            selectedEventId={selectedEvent?.id ?? null}
          />

          {selectedEvent && (
            <CalendarEventDetailPanel
              key={selectedEvent.id}
              event={selectedEvent}
              capture={selectedCapture}
              onClose={() => setSelectedEvent(null)}
              onDelete={selectedCapture ? handleDeleteCapture : undefined}
              onDuplicate={selectedCapture ? handleDuplicateCapture : undefined}
              onEdit={() => undefined}
              onSaveEdit={
                selectedCapture ? handleSaveCaptureEdit : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
