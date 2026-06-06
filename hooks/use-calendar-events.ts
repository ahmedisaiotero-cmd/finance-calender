"use client";

import { useEffect, useState } from "react";

import { getCalendarEventsForMonth } from "@/lib/build-calendar-events";
import type { CalendarEvent } from "@/src/data/calendar-events";
import type { Transaction } from "@/src/data/transactions";

export function useCalendarEvents(
  year: number,
  month: number,
  transactions: Transaction[],
  usingDatabase: boolean,
) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (usingDatabase) {
        try {
          const res = await fetch(
            `/api/calendar?year=${year}&month=${month}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) {
              setEvents(data.events as CalendarEvent[]);
              setReady(true);
            }
            return;
          }
        } catch {
          // fall through to client merge
        }
      }

      if (!cancelled) {
        setEvents(getCalendarEventsForMonth(year, month, { transactions }));
        setReady(true);
      }
    }

    setReady(false);
    load();

    return () => {
      cancelled = true;
    };
  }, [year, month, transactions, usingDatabase]);

  return { events, ready };
}
