"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  getCalendarCells,
  getMonthLabel,
  groupEventsByDate,
  parseDateKey,
  toDateKey,
} from "@/lib/calendar-utils";
import { getCalendarEventsForMonth } from "@/lib/build-calendar-events";
import type { CalendarEvent, CalendarEventSource } from "@/src/data/calendar-events";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const sourceLabels: Record<CalendarEventSource, string> = {
  recurring: "Recurring",
  transaction: "Logged",
  scheduled: "Scheduled",
};

type MonthCalendarProps = {
  initialYear?: number;
  initialMonth?: number;
};

export function MonthCalendar({
  initialYear,
  initialMonth,
}: MonthCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(initialYear ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ?? now.getMonth());
  const [selectedKey, setSelectedKey] = useState(toDateKey(now));

  const events = useMemo(
    () => getCalendarEventsForMonth(viewYear, viewMonth),
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
    <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
      <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-6 lg:col-span-3">
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {(
            Object.entries(sourceLabels) as [CalendarEventSource, string][]
          ).map(([key, label]) => (
            <span
              key={key}
              className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1"
            >
              {label}
              {key === "recurring" && " · monthly"}
            </span>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {getMonthLabel(viewYear, viewMonth)}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="rounded-full"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
            const isSelected = cell.dateKey === selectedKey;
            const hasIncome = dayEvents.some((e) => e.amount >= 0);
            const hasExpense = dayEvents.some((e) => e.amount < 0);

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedKey(cell.dateKey)}
                className={cn(
                  "flex min-h-[4.5rem] flex-col items-center rounded-2xl border border-transparent p-1.5 text-left transition-colors sm:min-h-[5.25rem] sm:p-2",
                  cell.isCurrentMonth
                    ? "text-foreground"
                    : "text-muted-foreground/50",
                  isSelected && "border-border bg-accent shadow-sm",
                  !isSelected && "hover:bg-muted/50",
                  cell.isToday && !isSelected && "ring-1 ring-border",
                )}
              >
                <span
                  className={cn(
                    "mb-1 flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums",
                    cell.isToday &&
                      "bg-primary text-primary-foreground",
                  )}
                >
                  {cell.date.getDate()}
                </span>
                <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span
                      key={event.id}
                      className={cn(
                        "truncate rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight sm:text-[11px]",
                        event.amount >= 0
                          ? "bg-income-muted text-income"
                          : "bg-expense-muted text-expense",
                      )}
                    >
                      {event.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-auto flex gap-0.5 pt-1">
                    {hasIncome && (
                      <span className="size-1.5 rounded-full bg-income" />
                    )}
                    {hasExpense && (
                      <span className="size-1.5 rounded-full bg-expense opacity-60" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-3xl border border-border/60 bg-card shadow-sm lg:col-span-2">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-lg font-semibold tracking-tight">
            {selectedLabel}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {selectedEvents.length === 0
              ? "No events scheduled"
              : `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {selectedEvents.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
            Select a day with activity. Add data in{" "}
            <code className="text-xs">recurring-events.ts</code>,{" "}
            <code className="text-xs">transactions.ts</code>, or{" "}
            <code className="text-xs">calendar-events.ts</code>.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {selectedEvents.map((event) => {
              const isIncome = event.amount >= 0;
              return (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.category}
                      <span className="mx-1.5 text-muted-foreground/50">
                        ·
                      </span>
                      <span className="text-xs">
                        {sourceLabels[event.source]}
                      </span>
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      isIncome ? "text-income" : "text-foreground",
                    )}
                  >
                    {formatCurrency(event.amount)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {selectedEvents.length > 0 && (
          <div className="border-t border-border/60 px-5 py-4 sm:px-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Day total</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(
                  selectedEvents.reduce((sum, e) => sum + e.amount, 0),
                )}
              </span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
