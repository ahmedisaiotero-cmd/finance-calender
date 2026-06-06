"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarLensEmpty } from "@/components/calendar/calendar-lens-empty";
import { CalendarSelectedDayPanel } from "@/components/calendar/calendar-selected-day-panel";
import { CalendarSummaryBar } from "@/components/calendar/calendar-summary-bar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CategoryLensBar } from "@/components/calendar/category-lens-bar";
import { healthStats } from "@/components/health/health-mock-data";
import { SYNC_DB_SYNCED_LABEL, SYNC_LOADING_LABEL } from "@/lib/sync-copy";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { useTransactions } from "@/hooks/use-transactions";
import {
  getHealthEventsForMonth,
  totalActiveMinutes,
} from "@/lib/build-health-calendar-events";
import {
  getCalendarCells,
  getMonthLabel,
  getUniqueMonthsFromCells,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";
import { monthlySpending } from "@/lib/mock-data";
import {
  filterTransactionsForMonth,
  formatTransactionTotal,
  summarizeTransactions,
} from "@/lib/transaction-utils";
import { getItemsForDate, itemToTimelineEvent } from "@/lib/sync-timeline";
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

const PLACEHOLDER_LENSES = [
  "career",
  "relationships",
  "personal",
] as const satisfies CalendarLens[];

function isPlaceholderLens(
  lens: CalendarLens,
): lens is (typeof PLACEHOLDER_LENSES)[number] {
  return (PLACEHOLDER_LENSES as readonly string[]).includes(lens);
}

function adjacentMonth(year: number, month: number, delta: number) {
  return new Date(year, month + delta, 1);
}

export function FinanceCalendarContent({
  initialYear,
  initialMonth,
}: FinanceCalendarContentProps) {
  const { transactions, ready, usingDatabase } = useTransactions();
  const now = new Date();
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

  const lensEvents = useMemo(
    () => filterTimelineByLens(mergedTimeline, lens),
    [mergedTimeline, lens],
  );

  const timelineByDate = useMemo(
    () => groupTimelineByDate(lensEvents),
    [lensEvents],
  );

  const monthTimeline = useMemo(() => {
    const currentMonthKeys = new Set(
      cells.filter((cell) => cell.isCurrentMonth).map((cell) => cell.dateKey),
    );
    return mergedTimeline.filter((e) => currentMonthKeys.has(e.date));
  }, [cells, mergedTimeline]);

  const monthStats = useMemo(() => {
    const monthTx = filterTransactionsForMonth(
      transactions,
      viewYear,
      viewMonth,
    );
    const { expenses } = summarizeTransactions(monthTx);
    const spent =
      expenses > 0 ? expenses : Math.round(monthlySpending.spent);

    const healthEvents = getHealthEventsForMonth(viewYear, viewMonth);
    const minutes = totalActiveMinutes(healthEvents);
    const activeHours = Math.round(minutes / 60);

    const activeDays = new Set(healthEvents.map((e) => e.date)).size;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const isCurrentMonth =
      viewYear === now.getFullYear() && viewMonth === now.getMonth();
    const elapsed = isCurrentMonth ? now.getDate() : daysInMonth;
    const computedConsistency = Math.min(
      100,
      Math.round((activeDays / Math.max(elapsed, 1)) * 100),
    );
    const consistency =
      isCurrentMonth && computedConsistency > 0
        ? computedConsistency
        : isCurrentMonth
          ? healthStats.recovery.value
          : computedConsistency || healthStats.recovery.value;

    return {
      timelineItems: monthTimeline.length,
      spent: formatTransactionTotal(spent),
      activeHours,
      consistency,
    };
  }, [transactions, viewYear, viewMonth, monthTimeline.length, now]);

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

  const redirectLegacyMoneyHash = useCallback(() => {
    const hash = window.location.hash;
    if (hash === "#transactions" || hash === "#budgets") {
      window.location.replace("/money");
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

  const showCalendarGrid = !isPlaceholderLens(lens);

  return (
    <div className="flex w-full flex-col gap-10 sm:gap-12">
      <CalendarSummaryBar
        timelineItems={monthStats.timelineItems}
        spent={monthStats.spent}
        activeHours={monthStats.activeHours}
        consistency={monthStats.consistency}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <CategoryLensBar value={lens} onChange={setLens} />
        {(usingLiveTimeline || usingDatabase) && (
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/45">
            {SYNC_DB_SYNCED_LABEL}
          </p>
        )}
      </div>

      {isPlaceholderLens(lens) && <CalendarLensEmpty lens={lens} />}

      {showCalendarGrid && (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-14 xl:gap-16">
          <section className="min-w-0 rounded-lg border border-border/35 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
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
            showTodayTrackers={
              selectedKey === todayKey && (lens === "all" || lens === "health")
            }
          />
        </div>
      )}
    </div>
  );
}
