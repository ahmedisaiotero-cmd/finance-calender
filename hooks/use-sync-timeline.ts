"use client";

import { useCallback, useMemo } from "react";

import { useCalendarEvents } from "@/hooks/use-calendar-events";
import { useTransactions } from "@/hooks/use-transactions";
import {
  useEnsureTimelineFetch,
  useTimelineCacheSnapshot,
  type TimelineApiResponse,
} from "@/lib/sync-fetch-cache";
import { buildUnifiedTimeline } from "@/lib/unified-timeline";
import type { TimelineEvent } from "@/lib/timeline-events";

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

  const fetchTimeline = useCallback(
    () => fetchTimelineFromApi(year, month),
    [year, month],
  );

  useEnsureTimelineFetch(year, month, fetchTimeline);
  const remote = useTimelineCacheSnapshot(year, month);

  const remoteChecked = remote.ready;
  const remoteTimeline = remote.data?.events ?? null;
  const timelineSource = remoteChecked
    ? remoteTimeline != null && remoteTimeline.length > 0
      ? remote.data?.source === "prisma"
        ? "prisma"
        : "supabase"
      : "mock"
    : "loading";

  const usingLiveTimeline =
    remoteTimeline != null && remoteTimeline.length > 0;

  const timeline = useMemo(() => {
    if (usingLiveTimeline) {
      return remoteTimeline as TimelineEvent[];
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
