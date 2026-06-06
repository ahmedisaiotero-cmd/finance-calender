"use client";

import { useMemo } from "react";

import { healthStats } from "@/components/health/health-mock-data";
import {
  countHealthSessionsThisWeek,
  getNextHealthOpportunity,
} from "@/lib/health-from-timeline";
import { useStableNow } from "@/hooks/use-stable-now";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { buildHealthRhythmMessage } from "@/lib/sync-pulse";
import { SYNC_LOADING_LABEL } from "@/lib/sync-copy";

export function HealthSummaryBar() {
  const now = useStableNow();
  const { timeline, ready } = useSyncTimeline(
    now.getFullYear(),
    now.getMonth(),
  );

  const sessions = useMemo(
    () => countHealthSessionsThisWeek(timeline, now),
    [timeline, now],
  );

  const nextHealth = useMemo(
    () => getNextHealthOpportunity(timeline, now),
    [timeline, now],
  );

  const rhythm = buildHealthRhythmMessage(sessions, nextHealth);
  const recovery = healthStats.recovery.value;

  if (!ready) {
    return (
      <p className="text-[13px] text-muted-foreground/60">{SYNC_LOADING_LABEL}</p>
    );
  }

  return (
    <p className="text-[13px] leading-relaxed tracking-[-0.01em] text-muted-foreground/75">
      {rhythm}{" "}
      <span className="text-muted-foreground/55">
        Recovery is at {recovery}%.
      </span>
    </p>
  );
}
