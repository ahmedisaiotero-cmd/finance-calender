"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarDayPanel } from "@/components/calendar/calendar-day-panel";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarSourceLegend } from "@/components/calendar/calendar-source-legend";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { BudgetOverview } from "@/components/finance/budget-overview";
import { FinanceTransactionList } from "@/components/finance/finance-transaction-list";
import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { TransactionSummaryCards } from "@/components/transactions/transaction-summary-cards";
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
import { filterTransactionsForMonth } from "@/lib/transaction-utils";

type FinanceCalendarContentProps = {
  initialYear?: number;
  initialMonth?: number;
};

export function FinanceCalendarContent({
  initialYear,
  initialMonth,
}: FinanceCalendarContentProps) {
  const { transactions, addTransaction, ready } = useTransactions();
  const now = new Date();
  const [viewYear, setViewYear] = useState(initialYear ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ?? now.getMonth());
  const [selectedKey, setSelectedKey] = useState(toDateKey(now));

  const monthLabel = getMonthLabel(viewYear, viewMonth);

  const monthTransactions = useMemo(
    () => filterTransactionsForMonth(transactions, viewYear, viewMonth),
    [transactions, viewYear, viewMonth],
  );

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

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

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

  function handleAddTransaction(input: Parameters<typeof addTransaction>[0]) {
    addTransaction(input);
    if (input.dateISO) {
      setSelectedKey(input.dateISO);
      const [y, m] = input.dateISO.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground">Loading finance data…</p>
    );
  }

  return (
    <div className="space-y-8">
      <AddTransactionForm onAdd={handleAddTransaction} />

      <TransactionSummaryCards transactions={monthTransactions} />

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <SurfaceCard className="p-4 sm:p-6 lg:col-span-3">
          <CalendarSourceLegend />
          <CalendarToolbar
            monthLabel={monthLabel}
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

      <BudgetOverview
        transactions={monthTransactions}
        monthLabel={monthLabel}
      />

      <FinanceTransactionList
        transactions={monthTransactions}
        selectedDateKey={selectedKey}
        monthLabel={monthLabel}
      />
    </div>
  );
}
