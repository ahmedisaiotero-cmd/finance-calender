import type { TimelineEvent } from "@/lib/timeline-events";
import type { LifeAreaConnectionSignals } from "@/lib/user-life-areas";
import { mockLifeAreaEnabled } from "@/lib/user-life-areas";

/**
 * Stable account-level connections for sidebar nav.
 * Nav must never read timeline events — that caused Work/Health flicker.
 *
 * Preview Health in primary nav: keep `health: true` (default).
 * Move Health to Optional Areas: set `health: false`.
 */
export const mockAccountConnections = {
  health: true,
} as const;

export type StableAccountConnectionInput = {
  financeDb: boolean;
  healthAccountConnected?: boolean;
  workAccountConnected?: boolean;
  schoolAccountConnected?: boolean;
  hasGoals?: boolean;
};

/**
 * Resolves sidebar connection signals from account/integration state only.
 */
export function deriveStableNavConnectionSignals(
  input: StableAccountConnectionInput,
): LifeAreaConnectionSignals {
  return deriveNavConnectionSignals({
    financeConnected: input.financeDb,
    healthConnected:
      input.healthAccountConnected === true ||
      mockAccountConnections.health ||
      mockLifeAreaEnabled.health,
    hasWorkConnection: input.workAccountConnected === true,
    hasSchoolConnection: input.schoolAccountConnected === true,
    hasGoals: input.hasGoals === true,
  });
}

/** Loose match for school-related timeline titles until a dedicated category exists. */
const SCHOOL_EVENT_PATTERN =
  /\b(class|exam|lecture|homework|school|university|college|midterm|finals)\b/i;

export type NavConnectionSignalInput = {
  financeConnected?: boolean;
  healthConnected?: boolean;
  hasWorkConnection?: boolean;
  hasSchoolConnection?: boolean;
  hasGoals?: boolean;
  hasFamilyConnection?: boolean;
  hasTravelConnection?: boolean;
};

/**
 * Stable connection signals for life-area state.
 * Only account/integration flags — never volatile timeline content.
 */
export function deriveNavConnectionSignals(
  input: NavConnectionSignalInput = {},
): LifeAreaConnectionSignals {
  return {
    financeConnected: input.financeConnected === true,
    healthConnected: input.healthConnected === true,
    hasWorkConnection: input.hasWorkConnection === true,
    hasSchoolConnection: input.hasSchoolConnection === true,
    hasGoals: input.hasGoals === true,
    hasFamilyConnection: input.hasFamilyConnection === true,
    hasTravelConnection: input.hasTravelConnection === true,
  };
}

export function countWorkEventsOnDate(
  timeline: TimelineEvent[],
  dateKey: string,
): number {
  return timeline.filter(
    (event) => event.lifeCategory === "career" && event.date === dateKey,
  ).length;
}

export function hasUpcomingSchoolEvents(
  timeline: TimelineEvent[],
  todayKey: string,
): boolean {
  return timeline.some(
    (event) =>
      event.date >= todayKey && SCHOOL_EVENT_PATTERN.test(event.title),
  );
}
