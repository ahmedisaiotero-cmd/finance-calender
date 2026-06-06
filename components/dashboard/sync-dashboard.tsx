"use client";

import { useMemo } from "react";

import { HomeCategorySnapshot } from "@/components/dashboard/home-category-snapshot";
import { HomeTodayFocus } from "@/components/dashboard/home-today-focus";
import { PageHeader, PulseBlock } from "@/components/sync";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { useSyncUser } from "@/hooks/use-sync-user";
import { toDateKey } from "@/lib/calendar-utils";
import {
  countCareerFocusAreas,
  countHealthSessionsThisWeek,
  getCareerFocusTitleFromTimeline,
  getNextHealthOpportunity,
} from "@/lib/health-from-timeline";
import {
  buildHomeFocusItems,
  getMotivationalLine,
  getRecoveryPercent,
} from "@/lib/home-focus";
import {
  buildHealthRhythmMessage,
  buildMoneySnapshotNote,
  resolvePulse,
} from "@/lib/sync-pulse";
import { SYNC_HOME_SUBTITLE, SYNC_PRODUCT } from "@/lib/sync-copy";
import { monthlySpending } from "@/lib/mock-data";
import {
  filterTransactionsForMonth,
  summarizeTransactions,
} from "@/lib/transaction-utils";

export function SyncDashboard() {
  const now = new Date();
  const todayKey = toDateKey(now);
  const viewYear = now.getFullYear();
  const viewMonth = now.getMonth();

  const { user } = useSyncUser();
  const { timeline, ready, transactions, usingLiveTimeline } = useSyncTimeline(
    viewYear,
    viewMonth,
  );

  const liveToday = useMemo(
    () => timeline.filter((e) => e.date === todayKey),
    [timeline, todayKey],
  );

  const focusItems = useMemo(
    () =>
      buildHomeFocusItems(liveToday, now, 5, {
        liveOnly: usingLiveTimeline,
      }),
    [liveToday, now, usingLiveTimeline],
  );

  const healthSessions = useMemo(
    () => countHealthSessionsThisWeek(timeline, now),
    [timeline, now],
  );

  const nextHealth = useMemo(
    () => getNextHealthOpportunity(timeline, now),
    [timeline, now],
  );

  const moneySnapshot = useMemo(() => {
    const monthTx = filterTransactionsForMonth(transactions, viewYear, viewMonth);
    const { expenses } = summarizeTransactions(monthTx);
    const spent =
      expenses > 0 ? Math.round(expenses) : Math.round(monthlySpending.spent);
    const budget = monthlySpending.budget;
    const remaining = Math.max(budget - spent, 0);
    const withinBudget = spent <= budget;
    const budgetUsedPercent =
      budget > 0 ? Math.round((spent / budget) * 100) : 0;
    return { spent, remaining, withinBudget, budgetUsedPercent, budget };
  }, [transactions, viewYear, viewMonth]);

  const pulse = useMemo(
    () =>
      resolvePulse({
        workoutsDone: healthSessions,
        workoutsGoal: 5,
        recoveryPercent: getRecoveryPercent(),
        withinBudget: moneySnapshot.withinBudget,
        budgetUsedPercent: moneySnapshot.budgetUsedPercent,
      }),
    [
      healthSessions,
      moneySnapshot.withinBudget,
      moneySnapshot.budgetUsedPercent,
    ],
  );

  const careerTitle = useMemo(
    () => getCareerFocusTitleFromTimeline(timeline, now),
    [timeline, now],
  );

  const careerFocusCount = useMemo(
    () => countCareerFocusAreas(timeline, now),
    [timeline, now],
  );

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const moneyLabel = buildMoneySnapshotNote(
    moneySnapshot.spent,
    moneySnapshot.budget,
    moneySnapshot.remaining,
  );
  const healthLabel = buildHealthRhythmMessage(
    healthSessions,
    now,
    nextHealth,
  );
  const careerLabel = `${careerFocusCount} focus ${careerFocusCount === 1 ? "area" : "areas"} · ${careerTitle}`;

  return (
    <div
      className="flex w-full max-w-2xl flex-col gap-8 sm:gap-10"
      data-page="home"
    >
      <PageHeader
        eyebrow={SYNC_PRODUCT.name}
        title={`Welcome back, ${user.name}.`}
        dateLabel={todayLabel}
        subtitle={SYNC_HOME_SUBTITLE}
        motivation={getMotivationalLine(now)}
      />

      <PulseBlock pulse={pulse} />

      <HomeTodayFocus items={focusItems} loading={!ready} />

      <HomeCategorySnapshot
        moneyLabel={moneyLabel}
        healthLabel={healthLabel}
        careerLabel={careerLabel}
      />
    </div>
  );
}
