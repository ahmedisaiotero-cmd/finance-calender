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

type RemoteTimelineState = {
  key: string | null;
  timeline: TimelineEvent[] | null;
  source: "supabase" | "prisma" | "mock" | "loading";
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
  const requestKey = `${year}-${month}`;
  const [remoteState, setRemoteState] = useState<RemoteTimelineState>({
    key: null,
    timeline: null,
    source: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchTimelineFromApi(year, month);
      if (cancelled) return;

      const events = result?.events ?? [];

      setRemoteState({
        key: requestKey,
        timeline: events,
        source:
          events.length > 0
            ? result?.source === "prisma"
              ? "prisma"
              : "supabase"
            : "mock",
      });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [year, month, requestKey]);

  const remoteChecked = remoteState.key === requestKey;
  const remoteTimeline = remoteState.timeline;
  const timelineSource = remoteChecked ? remoteState.source : "loading";

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
