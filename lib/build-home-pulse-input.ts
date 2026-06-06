import type { HomeUpcomingEvent } from "@/lib/home-upcoming";
import {
  countWorkEventsOnDate,
  hasUpcomingSchoolEvents,
} from "@/lib/life-area-signals";
import type { PulseInput } from "@/lib/sync-pulse";
import type { TimelineEvent } from "@/lib/timeline-events";
import type { ActiveLifeAreas } from "@/lib/user-life-areas";
import { isLifeAreaActive } from "@/lib/user-life-areas";

export type HomePulseContext = {
  activeLifeAreas: ActiveLifeAreas;
  todayKey: string;
  timeline: TimelineEvent[];
  scheduleFull: boolean;
  scheduleLight: boolean;
  topPrioritiesCount: number;
  calendarConnected: boolean;
  sleepLight: boolean;
  recoveryLow: boolean;
  recoveryStrong: boolean;
  workoutsDone: number;
  workoutsGoal: number;
  healthConnected: boolean;
  withinBudget: boolean;
  budgetTight: boolean;
  billsUpcoming: boolean;
  cashFlowHealthy: boolean;
  moneyConnected: boolean;
  upcomingEvents: HomeUpcomingEvent[];
};

/**
 * Prepares home Pulse input from dashboard context.
 * Only includes signals for active life areas.
 */
export function buildHomePulseInput(ctx: HomePulseContext): PulseInput {
  const goalsActive = isLifeAreaActive(ctx.activeLifeAreas, "goals");
  const workActive = isLifeAreaActive(ctx.activeLifeAreas, "work");
  const schoolActive = isLifeAreaActive(ctx.activeLifeAreas, "school");

  const workEventsToday = workActive
    ? countWorkEventsOnDate(ctx.timeline, ctx.todayKey)
    : 0;

  const schoolEventsUpcoming = schoolActive
    ? hasUpcomingSchoolEvents(ctx.timeline, ctx.todayKey)
    : false;

  return {
    activeLifeAreas: ctx.activeLifeAreas,
    scheduleFull: ctx.scheduleFull,
    scheduleLight: ctx.scheduleLight,
    topPrioritiesCount: ctx.topPrioritiesCount,
    calendarConnected: ctx.calendarConnected,
    sleepLight: ctx.sleepLight,
    recoveryLow: ctx.recoveryLow,
    recoveryStrong: ctx.recoveryStrong,
    workoutsDone: ctx.workoutsDone,
    workoutsGoal: ctx.workoutsGoal,
    healthConnected: ctx.healthConnected,
    withinBudget: ctx.withinBudget,
    budgetTight: ctx.budgetTight,
    billsUpcoming: ctx.billsUpcoming,
    cashFlowHealthy: ctx.cashFlowHealthy,
    moneyConnected: ctx.moneyConnected,
    goalsOnTrack:
      goalsActive && ctx.topPrioritiesCount > 0 && !ctx.scheduleFull,
    goalsNeedAttention:
      goalsActive && ctx.scheduleFull && ctx.topPrioritiesCount >= 3,
    workCalendarHeavy: workActive && workEventsToday >= 2 && ctx.scheduleFull,
    schoolEventsUpcoming: schoolActive && schoolEventsUpcoming,
  };
}
