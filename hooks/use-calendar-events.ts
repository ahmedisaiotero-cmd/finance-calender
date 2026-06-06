"use client";

import { useEffect, useState } from "react";

import { getCalendarEventsForMonth } from "@/lib/build-calendar-events";
import type { CalendarEvent } from "@/src/data/calendar-events";
import type { Transaction } from "@/src/data/transactions";

type CalendarEventsResult = {
  key: string | null;
  events: CalendarEvent[];
};

export function useCalendarEvents(
  year: number,
  month: number,
  transactions: Transaction[],
  usingDatabase: boolean,
) {
  const requestKey = `${year}-${month}-${usingDatabase}`;
  const [result, setResult] = useState<CalendarEventsResult>({
    key: null,
    events: [],
  });

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
              setResult({
                key: requestKey,
                events: data.events as CalendarEvent[],
              });
            }
            return;
          }
        } catch {
          // fall through to client merge
        }
      }

      if (!cancelled) {
        setResult({
          key: requestKey,
          events: getCalendarEventsForMonth(year, month, { transactions }),
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [year, month, transactions, usingDatabase, requestKey]);

  const ready = result.key === requestKey;

  return { events: result.events, ready };
}
