import type { CapturedSyncItem } from "@/lib/captured-items";
import type { DailyBriefSnapshot } from "@/lib/mobile-prototype/build-daily-brief";
import {
  buildHomePriorities,
  type HomePrioritiesView,
} from "@/lib/mobile-prototype/build-home-priorities";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type TodayBriefLine = import("@/lib/intelligence/consequence-link").ConsequenceLink;

export type TodayViewModel = HomePrioritiesView & {
  /** @deprecated use primaryPriority */
  insight: TodayBriefLine;
  /** @deprecated use supportingPriorities */
  priorityDetails: TodayBriefLine[];
};

export function buildTodayView(input: {
  brief: DailyBriefSnapshot;
  consequences: SyncConsequence[];
  items: CapturedSyncItem[];
  reference?: Date;
  workSchedule?: PersistedWorkSchedule | null;
}): TodayViewModel {
  const reference = input.reference ?? new Date();
  const view = buildHomePriorities({
    consequences: input.consequences,
    items: input.items,
    reference,
    workSchedule: input.workSchedule,
    hasUserContext: !input.brief.isEmpty,
  });

  return {
    ...view,
    insight: view.primaryPriority,
    priorityDetails: view.supportingPriorities,
  };
}
