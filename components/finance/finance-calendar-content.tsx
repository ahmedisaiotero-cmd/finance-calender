"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarLensEmpty } from "@/components/calendar/calendar-lens-empty";
import { CalendarSourceLegend } from "@/components/calendar/calendar-source-legend";
import {
  CalendarSegmentTabs,
  moneySegmentFromHash,
  type MoneySegment,
} from "@/components/calendar/calendar-segment-tabs";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CategoryLensBar } from "@/components/calendar/category-lens-bar";
import { TimelineDayPanel } from "@/components/calendar/timeline-day-panel";
import { CalendarDayPanel } from "@/components/calendar/calendar-day-panel";
import { BudgetOverview } from "@/components/finance/budget-overview";
import { FinanceTransactionList } from "@/components/finance/finance-transaction-list";
import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  SYNC_CALENDAR_ALL_HINT,
  SYNC_DB_SYNCED_LABEL,
  SYNC_LOADING_LABEL,
} from "@/lib/sync-copy";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useTransactions } from "@/hooks/use-transactions";
import {
  getCalendarCells,
  getMonthLabel,
  groupEventsByDate,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";
import {
  filterTimelineByLens,
  groupTimelineByDate,
  mergeTimelineForMonth,
  type CalendarLens,
} from "@/lib/timeline-events";
import { filterTransactionsForMonth } from "@/lib/transaction-utils";

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

export function FinanceCalendarContent({
  initialYear,
  initialMonth,
}: FinanceCalendarContentProps) {
  const { transactions, addTransaction, ready, usingDatabase } =
    useTransactions();
  const now = new Date();
  const [viewYear, setViewYear] = useState(initialYear ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ?? now.getMonth());
  const [selectedKey, setSelectedKey] = useState(toDateKey(now));
  const [lens, setLens] = useState<CalendarLens>("all");
  const [moneySegment, setMoneySegment] = useState<MoneySegment>("overview");

  const monthLabel = getMonthLabel(viewYear, viewMonth);

  const monthTransactions = useMemo(
    () => filterTransactionsForMonth(transactions, viewYear, viewMonth),
    [transactions, viewYear, viewMonth],
  );

  const { events: moneyEvents, ready: eventsReady } = useCalendarEvents(
    viewYear,
    viewMonth,
    transactions,
    usingDatabase,
  );

  const mergedTimeline = useMemo(
    () => mergeTimelineForMonth(moneyEvents, viewYear, viewMonth),
    [moneyEvents, viewYear, viewMonth],
  );

  const lensEvents = useMemo(
    () => filterTimelineByLens(mergedTimeline, lens),
    [mergedTimeline, lens],
  );

  const timelineByDate = useMemo(
    () => groupTimelineByDate(lensEvents),
    [lensEvents],
  );

  const moneyByDate = useMemo(
    () => groupEventsByDate(moneyEvents),
    [moneyEvents],
  );

  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedTimeline = timelineByDate.get(selectedKey) ?? [];
  const selectedMoney = moneyByDate.get(selectedKey) ?? [];
  const selectedLabel = parseDateKey(selectedKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const syncHashToSegment = useCallback(() => {
    const hash = window.location.hash;
    if (hash === "#transactions" || hash === "#budgets") {
      setLens("money");
      setMoneySegment(moneySegmentFromHash(hash));
    }
  }, []);

  useEffect(() => {
    syncHashToSegment();
    window.addEventListener("hashchange", syncHashToSegment);
    return () => window.removeEventListener("hashchange", syncHashToSegment);
  }, [syncHashToSegment]);

  useEffect(() => {
    if (moneySegment === "transactions" || moneySegment === "budgets") {
      const el = document.getElementById(moneySegment);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  }, [moneySegment, lens]);

  function handleLensChange(next: CalendarLens) {
    setLens(next);
    if (next !== "money") {
      setMoneySegment("overview");
      const path = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", path);
    }
  }

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

  async function handleAddTransaction(
    input: Parameters<typeof addTransaction>[0],
  ) {
    await addTransaction(input);
    if (input.dateISO) {
      setSelectedKey(input.dateISO);
      const [y, m] = input.dateISO.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }

  if (!ready || !eventsReady) {
    return (
      <p className="text-sm text-muted-foreground">{SYNC_LOADING_LABEL}</p>
    );
  }

  const showCalendarGrid =
    !isPlaceholderLens(lens) &&
    (lens !== "money" || moneySegment === "overview");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <CategoryLensBar value={lens} onChange={handleLensChange} />
        <div className="flex flex-wrap items-center gap-2">
          {usingDatabase && (
            <p className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              {SYNC_DB_SYNCED_LABEL}
            </p>
          )}
        </div>
      </div>

      {lens === "all" && (
        <p className="max-w-2xl text-sm text-muted-foreground">
          {SYNC_CALENDAR_ALL_HINT}
        </p>
      )}

      {lens === "money" && (
        <CalendarSegmentTabs
          value={moneySegment}
          onChange={setMoneySegment}
        />
      )}

      {isPlaceholderLens(lens) && <CalendarLensEmpty lens={lens} />}

      {showCalendarGrid && (
        <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
          <SurfaceCard className="p-4 sm:p-6 lg:col-span-3">
            {lens === "money" ? <CalendarSourceLegend /> : (
              <p className="mb-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">All</span> —
                Money and Health on one grid. Switch lens to focus.
              </p>
            )}
            <CalendarToolbar
              monthLabel={monthLabel}
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
          </SurfaceCard>

          {lens === "money" ? (
            <CalendarDayPanel
              dateLabel={selectedLabel}
              events={selectedMoney}
            />
          ) : (
            <TimelineDayPanel
              dateLabel={selectedLabel}
              events={selectedTimeline}
              lens={lens === "health" ? "health" : "all"}
            />
          )}
        </div>
      )}

      {lens === "money" && moneySegment === "overview" && (
        <AddTransactionForm onAdd={handleAddTransaction} />
      )}

      {lens === "money" && moneySegment === "transactions" && (
        <div className="space-y-6">
          <TransactionSummaryCards transactions={monthTransactions} />
          <FinanceTransactionList
            transactions={monthTransactions}
            selectedDateKey={selectedKey}
            monthLabel={monthLabel}
          />
        </div>
      )}

      {lens === "money" && moneySegment === "budgets" && (
        <BudgetOverview
          transactions={monthTransactions}
          monthLabel={monthLabel}
        />
      )}
    </div>
  );
}
