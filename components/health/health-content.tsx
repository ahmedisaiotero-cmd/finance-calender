"use client";

import { useMemo } from "react";

import { HealthConnectedSource } from "@/components/health/health-connected-source";
import { HealthPageHeader } from "@/components/health/health-page-header";
import { HealthSummaryBar } from "@/components/health/health-summary-bar";
import { HealthTodaysBasics } from "@/components/health/health-todays-basics";
import { Pulse } from "@/components/sync";
import {
  healthBasics,
  healthStats,
  weeklyWorkoutSplit,
} from "@/components/health/health-mock-data";
import { useStableNow } from "@/hooks/use-stable-now";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import {
  countHealthSessionsThisWeek,
  getNextHealthOpportunity,
} from "@/lib/health-from-timeline";
import { resolveHomeConnections } from "@/lib/sync-connections";
import { buildHealthPulse } from "@/lib/sync-pulse";

export function HealthContent() {
  const now = useStableNow();
  const { timeline, ready, usingLiveTimeline, usingDatabase } = useSyncTimeline(
    now.getFullYear(),
    now.getMonth(),
  );

  const healthSessions = useMemo(
    () => countHealthSessionsThisWeek(timeline, now),
    [timeline, now],
  );

  const hasHealthEvents = useMemo(
    () => timeline.some((event) => event.lifeCategory === "health"),
    [timeline],
  );

  const nextHealth = useMemo(
    () => getNextHealthOpportunity(timeline, now),
    [timeline, now],
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

  const healthConnected = connections.health.status === "connected";
  const isHealthPreview = !usingLiveTimeline && ready;
  const showHealthData = !ready || healthConnected || isHealthPreview;

  const todayIsLight = useMemo(
    () =>
      weeklyWorkoutSplit.some(
        (day) =>
          day.status === "today" &&
          (day.workout.toLowerCase().includes("recovery") ||
            day.workout.toLowerCase().includes("rest") ||
            day.workout.toLowerCase().includes("mobility")),
      ),
    [],
  );

  const workoutsThisWeek = Math.max(
    healthSessions,
    healthStats.workoutsThisWeek.value,
  );

  const healthPulse = useMemo(
    () =>
      buildHealthPulse({
        sleepLight:
          healthBasics.sleep.lastNight < healthBasics.sleep.target - 0.75,
        recoveryLow: healthBasics.recovery.percent < 65,
        recoveryStrong: healthBasics.recovery.percent >= 75,
        movementConsistent: workoutsThisWeek >= 4,
        todayIsLight,
        healthConnected: showHealthData,
      }),
    [showHealthData, workoutsThisWeek, todayIsLight],
  );

  return (
    <div className="sync-health-page" data-page="health">
      <header className="sync-briefing">
        <HealthPageHeader />
        <HealthSummaryBar
          sessions={healthSessions}
          nextHealth={nextHealth}
          ready={ready}
        />
        <Pulse
          state={healthPulse.state}
          title={healthPulse.title}
          message={healthPulse.message}
          contributingSignals={healthPulse.contributingSignals}
        />
      </header>

      {showHealthData ? (
        <HealthTodaysBasics basics={healthBasics} />
      ) : (
        <HealthConnectedSource connection={connections.health} showEmpty />
      )}
    </div>
  );
}
