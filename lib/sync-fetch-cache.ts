"use client";

import { useEffect, useSyncExternalStore } from "react";

export type CacheSnapshot<T> = {
  data: T | undefined;
  ready: boolean;
  error: boolean;
};

type CacheEntry<T> = {
  snapshot: CacheSnapshot<T>;
  promise?: Promise<T | null>;
};

const EMPTY_CACHE_SNAPSHOT = {
  data: undefined,
  ready: false,
  error: false,
};

function createSharedFetchCache<T>() {
  const entries = new Map<string, CacheEntry<T>>();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(key: string): CacheSnapshot<T> {
      return entries.get(key)?.snapshot ?? EMPTY_CACHE_SNAPSHOT;
    },
    ensure(key: string, fetcher: () => Promise<T | null>) {
      const existing = entries.get(key);
      if (existing?.snapshot.ready) return;
      if (existing?.promise) return;

      const entry: CacheEntry<T> = existing ?? {
        snapshot: EMPTY_CACHE_SNAPSHOT,
      };
      entries.set(key, entry);

      entry.promise = fetcher()
        .then((data) => {
          entry.snapshot = {
            data: data ?? undefined,
            ready: true,
            error: data === null,
          };
          delete entry.promise;
          notify();
          return data;
        })
        .catch(() => {
          entry.snapshot = {
            data: undefined,
            ready: true,
            error: true,
          };
          delete entry.promise;
          notify();
          return null;
        });

      notify();
    },
  };
}

export type TimelineApiResponse = {
  events: import("@/lib/timeline-events").TimelineEvent[];
  source?: "supabase" | "prisma" | "none";
};

export type CalendarApiEvents = import("@/src/data/calendar-events").CalendarEvent[];

const timelineCache = createSharedFetchCache<TimelineApiResponse>();
const calendarCache = createSharedFetchCache<CalendarApiEvents>();

export function timelineCacheKey(year: number, month: number) {
  return `timeline:${year}-${month}`;
}

export function calendarCacheKey(year: number, month: number) {
  return `calendar:${year}-${month}`;
}

export function ensureTimelineFetch(
  year: number,
  month: number,
  fetcher: () => Promise<TimelineApiResponse | null>,
) {
  timelineCache.ensure(timelineCacheKey(year, month), fetcher);
}

export function ensureCalendarFetch(
  year: number,
  month: number,
  fetcher: () => Promise<CalendarApiEvents | null>,
) {
  calendarCache.ensure(calendarCacheKey(year, month), fetcher);
}

export function useTimelineCacheSnapshot(year: number, month: number) {
  const key = timelineCacheKey(year, month);
  return useSyncExternalStore(
    timelineCache.subscribe,
    () => timelineCache.getSnapshot(key),
    () => EMPTY_CACHE_SNAPSHOT,
  );
}

export function useCalendarCacheSnapshot(year: number, month: number) {
  const key = calendarCacheKey(year, month);
  return useSyncExternalStore(
    calendarCache.subscribe,
    () => calendarCache.getSnapshot(key),
    () => EMPTY_CACHE_SNAPSHOT,
  );
}

/** Subscribe hook consumers to cache updates when a fetch is kicked off. */
export function useEnsureTimelineFetch(
  year: number,
  month: number,
  fetcher: () => Promise<TimelineApiResponse | null>,
) {
  useEffect(() => {
    ensureTimelineFetch(year, month, fetcher);
  }, [year, month, fetcher]);
}

export function useEnsureCalendarFetch(
  year: number,
  month: number,
  fetcher: () => Promise<CalendarApiEvents | null>,
) {
  useEffect(() => {
    ensureCalendarFetch(year, month, fetcher);
  }, [year, month, fetcher]);
}
