"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarPageHeader } from "@/components/calendar/calendar-page-header";
import { CalendarSelectedDayPanel } from "@/components/calendar/calendar-selected-day-panel";
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
  type CapturedSyncItem,
} from "@/lib/captured-items";
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
  const { getItemsForDestination } = useCapturedItems();
  const capturedCalendarItems = getItemsForDestination("Calendar");
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

      <ScheduledBySync items={capturedCalendarItems} />

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
            onSelectDay={setSelectedKey}
          />
        </section>

        <CalendarSelectedDayPanel
          dateLabel={selectedLabel}
          events={selectedEvents}
          capturedItems={capturedCalendarItems}
        />
      </div>
    </div>
  );
}

function ScheduledBySync({ items }: { items: CapturedSyncItem[] }) {
  return (
    <section className="sync-home-surface">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[1.05rem] font-medium tracking-tight text-foreground/92">
            Scheduled by Sync
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground/66">
            Plans and reminders created from your capture inbox.
          </p>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary/80">
            New
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground/72">
          Nothing scheduled yet. Tell Sync what to plan.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="rounded-2xl border border-primary/15 bg-primary/5.5 px-4 py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium tracking-[-0.02em] text-foreground/92">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground/70">
                    {[item.dateLabel, item.timeLabel]
                      .filter((value) => value && value !== "Flexible")
                      .join(" • ") || "Flexible"}
                  </p>
                  {item.amount && (
                    <p
                      data-money-type={item.moneyType}
                      className="mt-1 text-[12px] font-medium text-muted-foreground/70 data-[money-type=income]:text-income/80"
                    >
                      {item.amount}
                    </p>
                  )}
                </div>
                {index === 0 && (
                  <span className="shrink-0 rounded-full border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary/75">
                    Added
                  </span>
                )}
              </div>
              <p className="mt-3 text-[12px] font-medium text-muted-foreground/68">
                {item.category}
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/55">
                {item.prompt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
