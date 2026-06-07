"use client";

import { useCallback, useMemo } from "react";

import { getCalendarEventsForMonth } from "@/lib/build-calendar-events";
import {
  useCalendarCacheSnapshot,
  useEnsureCalendarFetch,
  type CalendarApiEvents,
} from "@/lib/sync-fetch-cache";
import type { CalendarEvent } from "@/src/data/calendar-events";
import type { Transaction } from "@/src/data/transactions";

async function fetchCalendarFromApi(
  year: number,
  month: number,
): Promise<CalendarApiEvents | null> {
  try {
    const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.events as CalendarEvent[];
  } catch {
    return null;
  }
}

export function useCalendarEvents(
  year: number,
  month: number,
  transactions: Transaction[],
  usingDatabase: boolean,
) {
  const fetchCalendar = useCallback(
    () => fetchCalendarFromApi(year, month),
    [year, month],
  );

  useEnsureCalendarFetch(year, month, fetchCalendar);
  const cached = useCalendarCacheSnapshot(year, month);

  const localEvents = useMemo(() => {
    if (usingDatabase) return null;
    return getCalendarEventsForMonth(year, month, { transactions });
  }, [year, month, transactions, usingDatabase]);

  const events = useMemo(() => {
    if (!usingDatabase) {
      return localEvents ?? [];
    }
    if (!cached.ready) {
      return [];
    }
    if (cached.data !== undefined) {
      return cached.data;
    }
    return getCalendarEventsForMonth(year, month, { transactions });
  }, [
    usingDatabase,
    localEvents,
    cached.ready,
    cached.data,
    year,
    month,
    transactions,
  ]);

  const ready = !usingDatabase || cached.ready;

  return { events, ready };
}
