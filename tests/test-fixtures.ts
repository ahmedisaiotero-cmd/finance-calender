import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import type { ConversationTurn } from "@/lib/sync-engine/input/conversation-state";
import {
  EMPTY_USER_PROFILE,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";
import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import type { PulsePlanCategory } from "@/lib/pulse/types";
import type { SyncLabMemoryVisibilityMap } from "@/lib/sync-engine/tools/lab-state";

/**
 * Shared test builders aligned with current Sync type contracts.
 * Prefer these over incomplete inline fixtures when many tests need the same shape.
 */

export function createTestTimelineResolution(
  partial: Partial<TimelineResolution> &
    Pick<TimelineResolution, "timelineRole" | "label">,
): TimelineResolution {
  const isTimed = partial.isTimed ?? Boolean(partial.startTime);
  const kind: TimelineResolution["kind"] =
    partial.kind ??
    (partial.recurrence
      ? "recurring"
      : partial.startDate || partial.deadlineDate
        ? "single_date"
        : "unknown");

  return {
    confidence: 0.9,
    confidenceLabel: "high",
    needsConfirmation: false,
    tense: "future",
    sourceText: partial.label,
    scheduleInferenceApplied: false,
    timeSource: isTimed ? "input" : "none",
    ...partial,
    kind: partial.kind ?? kind,
    isTimed: partial.isTimed ?? isTimed,
  };
}

export function createTestSyncUserProfile(
  partial: Partial<SyncUserProfile> = {},
): SyncUserProfile {
  return {
    ...EMPTY_USER_PROFILE,
    ...partial,
  };
}

export function createTestWorkSchedule(
  partial: Partial<Omit<PersistedWorkSchedule, "recurrence">> & {
    recurrence?: Partial<PersistedWorkSchedule["recurrence"]>;
  } = {},
): PersistedWorkSchedule {
  return {
    days: partial.days ?? ["SU", "MO", "TU", "WE"],
    startTime: partial.startTime ?? "11:00",
    endTime: partial.endTime ?? "21:00",
    recurrence: {
      frequency: "weekly",
      interval: 1,
      startsOn: partial.recurrence?.startsOn ?? "2026-06-01",
      endsOn: null,
    },
    status: partial.status ?? "active",
    ...(partial.sourceItemId !== undefined
      ? { sourceItemId: partial.sourceItemId }
      : {}),
  };
}

export function createTestConversationTurn(
  partial: Omit<ConversationTurn, "role"> & {
    role: ConversationTurn["role"];
  },
): ConversationTurn {
  return {
    ...partial,
    role: partial.role,
  };
}

export function createTestCapturedItem(
  partial: Partial<CapturedSyncItem> &
    Pick<CapturedSyncItem, "id" | "title">,
): CapturedSyncItem {
  const category: PulsePlanCategory = partial.category ?? "general";
  const destinations: SyncDestination[] = partial.destinations
    ? [...partial.destinations]
    : ["Calendar"];

  return {
    category,
    prompt: partial.prompt ?? partial.title,
    dateLabel: partial.dateLabel ?? "",
    timeLabel: partial.timeLabel ?? "",
    status: partial.status ?? "active",
    createdAt: partial.createdAt ?? "2026-06-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-06-01T00:00:00.000Z",
    ...partial,
    destinations: partial.destinations ? [...partial.destinations] : destinations,
  };
}

export function createTestVisibilityMap(
  entries: Array<[string, "internal" | "visible"]>,
): SyncLabMemoryVisibilityMap {
  return Object.fromEntries(entries);
}
