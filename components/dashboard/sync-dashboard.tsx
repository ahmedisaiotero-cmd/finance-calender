"use client";

import { useMemo } from "react";

import { HomeGreeting } from "@/components/dashboard/home-greeting";
import { HomeTodayCard } from "@/components/dashboard/home-today-card";
import { Pulse } from "@/components/sync";
import { useStableNow } from "@/hooks/use-stable-now";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { useSyncUser } from "@/hooks/use-sync-user";
import { useUserLifeAreas } from "@/hooks/use-user-life-areas";
import { buildHomePulseInput } from "@/lib/build-home-pulse-input";
import { toDateKey } from "@/lib/calendar-utils";
import { getUpcomingTimelineEvents } from "@/lib/home-upcoming";
import { countHealthSessionsThisWeek } from "@/lib/health-from-timeline";
import { buildHomeFocusItems, getRecoveryPercent } from "@/lib/home-focus";
import { resolvePulse } from "@/lib/sync-pulse";
import { resolveHomeConnections } from "@/lib/sync-connections";
import { getTimeGreeting } from "@/lib/sync-copy";
import { monthlySpending } from "@/lib/mock-data";
import {
  filterTransactionsForMonth,
  summarizeTransactions,
} from "@/lib/transaction-utils";

export function SyncDashboard() {
  const now = useStableNow();
  const todayKey = toDateKey(now);
  const viewYear = now.getFullYear();
  const viewMonth = now.getMonth();

  const { user } = useSyncUser();
  const activeLifeAreas = useUserLifeAreas();
  const {
    timeline,
    ready,
    transactions,
    usingLiveTimeline,
    usingDatabase,
  } = useSyncTimeline(viewYear, viewMonth);

  const liveToday = useMemo(
    () => timeline.filter((e) => e.date === todayKey),
    [timeline, todayKey],
  );

  const upcomingEvents = useMemo(
    () => getUpcomingTimelineEvents(timeline, now, 6),
    [timeline, now],
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

  const moneySnapshot = useMemo(() => {
    const monthTx = filterTransactionsForMonth(transactions, viewYear, viewMonth);
    const { expenses } = summarizeTransactions(monthTx);
    const spent =
      expenses > 0 ? Math.round(expenses) : Math.round(monthlySpending.spent);
    const budget = monthlySpending.budget;
    const withinBudget = spent <= budget;
    const budgetUsedPercent =
      budget > 0 ? Math.round((spent / budget) * 100) : 0;
    return { withinBudget, budgetTight: budgetUsedPercent > 85 };
  }, [transactions, viewYear, viewMonth]);

  const recoveryPercent = getRecoveryPercent();
  const recoveryLow = recoveryPercent < 65;
  const recoveryStrong = recoveryPercent >= 80;
  const sleepLight = recoveryPercent < 70;

  const scheduleFull =
    upcomingEvents.length >= 4 ||
    focusItems.length >= 3 ||
    liveToday.length >= 4;
  const scheduleLight =
    liveToday.length <= 1 && upcomingEvents.length <= 2;

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

  const pulse = useMemo(() => {
    const input = buildHomePulseInput({
      activeLifeAreas,
      todayKey,
      timeline,
      scheduleFull,
      scheduleLight,
      topPrioritiesCount: focusItems.length,
      calendarConnected: connections.calendar.status === "connected",
      sleepLight,
      recoveryLow,
      recoveryStrong,
      workoutsDone: healthSessions,
      workoutsGoal: 5,
      healthConnected: connections.health.status === "connected",
      withinBudget: moneySnapshot.withinBudget,
      budgetTight: moneySnapshot.budgetTight,
      billsUpcoming: upcomingEvents.some((e) => e.category === "money"),
      cashFlowHealthy: moneySnapshot.withinBudget,
      moneyConnected: connections.money.status === "connected",
      upcomingEvents,
    });

    return resolvePulse(input);
  }, [
    activeLifeAreas,
    todayKey,
    timeline,
    scheduleFull,
    scheduleLight,
    focusItems.length,
    connections,
    sleepLight,
    recoveryLow,
    recoveryStrong,
    healthSessions,
    moneySnapshot,
    upcomingEvents,
  ]);

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="sync-home sync-home--focus" data-page="home">
      <header className="sync-briefing">
        <HomeGreeting greeting={getTimeGreeting(user.name, now)} />
        <Pulse
          state={pulse.state}
          title={pulse.title}
          message={pulse.message}
          contributingSignals={pulse.contributingSignals}
        />
      </header>

      <HomeTodayCard
        dateLabel={todayLabel}
        priorities={focusItems}
        calendar={connections.calendar}
        loading={!ready}
      />
    </div>
  );
}
