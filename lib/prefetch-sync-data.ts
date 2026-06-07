import {
  calendarCacheKey,
  ensureCalendarFetch,
  ensureTimelineFetch,
  timelineCacheKey,
} from "@/lib/sync-fetch-cache";

async function fetchTimelineFromApi(year: number, month: number) {
  try {
    const res = await fetch(`/api/timeline?year=${year}&month=${month}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCalendarFromApi(year: number, month: number) {
  try {
    const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.events;
  } catch {
    return null;
  }
}

/** Warm shared sync caches for a month (sidebar hover / link prefetch). */
export function prefetchSyncMonth(year: number, month: number) {
  ensureTimelineFetch(year, month, () => fetchTimelineFromApi(year, month));
  ensureCalendarFetch(year, month, () => fetchCalendarFromApi(year, month));
}

const SYNC_DATA_ROUTES = new Set(["/", "/calendar", "/finance", "/fitness"]);

export function prefetchSyncDataForRoute(href: string) {
  if (!SYNC_DATA_ROUTES.has(href)) return;
  const now = new Date();
  prefetchSyncMonth(now.getFullYear(), now.getMonth());
}

export { timelineCacheKey, calendarCacheKey };
