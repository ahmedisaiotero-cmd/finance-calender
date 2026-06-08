"use client";

import { useMemo } from "react";

import { HomeTodayCard } from "@/components/dashboard/home-today-card";
import { PulseOrganizer } from "@/components/pulse/pulse-organizer";
import { useStableNow } from "@/hooks/use-stable-now";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { toDateKey } from "@/lib/calendar-utils";
import { countHealthSessionsThisWeek } from "@/lib/health-from-timeline";
import { buildHomeFocusItems } from "@/lib/home-focus";
import { resolveHomeConnections } from "@/lib/sync-connections";

export function SyncDashboard() {
  const now = useStableNow();
  const todayKey = toDateKey(now);
  const viewYear = now.getFullYear();
  const viewMonth = now.getMonth();

  const {
    timeline,
    ready,
    usingLiveTimeline,
    usingDatabase,
  } = useSyncTimeline(viewYear, viewMonth);

  const liveToday = useMemo(
    () => timeline.filter((e) => e.date === todayKey),
    [timeline, todayKey],
  );

  const focusItems = useMemo(
    () =>
      buildHomeFocusItems(liveToday, now, 3, {
        liveOnly: usingLiveTimeline,
      }),
    [liveToday, now, usingLiveTimeline],
  );

  const healthSessions = useMemo(
    () => countHealthSessionsThisWeek(timeline, now),
    [timeline, now],
  );

  const hasHealthEvents = useMemo(
    () => timeline.some((event) => event.lifeCategory === "health"),
    [timeline],
  );

  const connections = useMemo(
    () =>
      resolveHomeConnections({
        usingLiveTimeline,
        usingDatabase,
        healthSessions,
        hasHealthEvents,
      }),
    [usingLiveTimeline, usingDatabase, healthSessions, hasHealthEvents],
  );

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="sync-home sync-home--focus" data-page="home">
      <header className="sync-home-hero flex w-full max-w-2xl flex-col pt-1 sm:pt-2">
        <h1 className="text-[2rem] font-medium leading-[1.05] tracking-[-0.045em] text-foreground/95 sm:text-[2.5rem]">
          SYNC
        </h1>
        <p className="mt-3 text-[16px] font-medium text-muted-foreground/68 sm:text-[17px]">
          Stay in Sync.
        </p>
      </header>

      <PulseOrganizer />

      <div className="flex w-full max-w-2xl flex-col gap-3">
        <p className="text-[12px] font-medium tracking-[0.02em] text-muted-foreground/52">
          Today essentials
        </p>
        <HomeTodayCard
          dateLabel={todayLabel}
          priorities={focusItems}
          calendar={connections.calendar}
          loading={!ready}
        />
      </div>
    </div>
  );
}
