"use client";

import { useEffect, useMemo, useState } from "react";

import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useTransactions } from "@/hooks/use-transactions";
import { buildUnifiedTimeline } from "@/lib/unified-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";

type TimelineApiResponse = {
  events: TimelineEvent[];
  source?: "supabase" | "prisma" | "none";
};

async function fetchTimelineFromApi(
  year: number,
  month: number,
): Promise<TimelineApiResponse | null> {
  try {
    const res = await fetch(`/api/timeline?year=${year}&month=${month}`);
    if (!res.ok) return null;
    return (await res.json()) as TimelineApiResponse;
  } catch {
    return null;
  }
}

export function useSyncTimeline(year: number, month: number) {
  const { transactions, ready: txReady, usingDatabase } = useTransactions();
  const { events: moneyEvents, ready: calReady } = useCalendarEvents(
    year,
    month,
    transactions,
    usingDatabase,
  );
  const [remoteTimeline, setRemoteTimeline] = useState<TimelineEvent[] | null>(
    null,
  );
  const [timelineSource, setTimelineSource] = useState<
    "supabase" | "prisma" | "mock" | "loading"
  >("loading");
  const [remoteChecked, setRemoteChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchTimelineFromApi(year, month);
      if (cancelled) return;

      const events = result?.events ?? [];
      setRemoteTimeline(events);

      if (events.length > 0) {
        setTimelineSource(result?.source === "prisma" ? "prisma" : "supabase");
      } else {
        setTimelineSource("mock");
      }
      setRemoteChecked(true);
    }

    setRemoteChecked(false);
    setTimelineSource("loading");
    load();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const usingLiveTimeline =
    remoteTimeline != null && remoteTimeline.length > 0;

  const timeline = useMemo(() => {
    if (usingLiveTimeline) {
      return remoteTimeline;
    }
    return buildUnifiedTimeline(moneyEvents, year, month);
  }, [usingLiveTimeline, remoteTimeline, moneyEvents, year, month]);

  const ready = txReady && calReady && remoteChecked;

  return {
    timeline,
    ready,
    usingDatabase,
    usingLiveTimeline,
    timelineSource,
    transactions,
  };
}
