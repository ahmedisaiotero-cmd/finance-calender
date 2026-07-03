import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  assessTomorrowLoad,
  headlineForTomorrowLoad,
} from "@/lib/intelligence/life-load";
import {
  buildMemoryProfile,
  describeMemoryType,
  type MemoryProfile,
} from "@/lib/intelligence/memory-profile";
import {
  buildPatternStateSnapshot,
  type PatternStateSnapshot,
} from "@/lib/intelligence/pattern-intelligence";
import {
  buildThreadPatternInsight,
  itemsInSameThread,
  resolveMemoryThread,
  type MemoryThread,
} from "@/lib/intelligence/memory-thread";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildHomePriorities } from "@/lib/mobile-prototype/build-home-priorities";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type SyncRuntimeJudgmentSnapshot = {
  primary: string;
  supporting: string[];
  futureContext: string | null;
  reflection: string | null;
  isQuiet: boolean;
  isEmpty: boolean;
  rankedCount: number;
};

export type SyncRuntimeBriefSnapshot = {
  lede: string;
  lines: string[];
  isEmpty: boolean;
};

export type SyncRuntimeConsequenceSnapshot = {
  count: number;
  tomorrowLoadLevel: string | null;
  tomorrowLoadHeadline: string | null;
};

export type SyncRuntimePatternSnapshot = {
  insight: string | null;
  thread: MemoryThread | null;
  threadPeerCount: number;
  profileArea: MemoryProfile["area"] | null;
  profileType: string | null;
  state: PatternStateSnapshot;
};

export type SyncRuntimeBrainState = {
  consequences: SyncRuntimeConsequenceSnapshot;
  brief: SyncRuntimeBriefSnapshot;
  judgment: SyncRuntimeJudgmentSnapshot;
  responseEnginePrimary: string;
};

export type SyncRuntimeBrainEvaluation = {
  before: SyncRuntimeBrainState;
  after: SyncRuntimeBrainState;
  judgmentChanged: boolean;
  briefChanged: boolean;
  pattern: SyncRuntimePatternSnapshot;
};

function briefFingerprint(state: SyncRuntimeBriefSnapshot) {
  return [state.lede, ...state.lines]
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function judgmentFingerprint(state: SyncRuntimeJudgmentSnapshot) {
  return [state.primary, ...state.supporting].join("|").toLowerCase();
}

function buildPatternSnapshot(input: {
  focusItem: CapturedSyncItem | null;
  items: CapturedSyncItem[];
  reference: Date;
}): SyncRuntimePatternSnapshot {
  if (!input.focusItem) {
    return {
      insight: null,
      thread: null,
      threadPeerCount: 0,
      profileArea: null,
      profileType: null,
      state: buildPatternStateSnapshot({
        items: input.items,
        reference: input.reference,
      }),
    };
  }

  const profile = buildMemoryProfile(input.focusItem, input.reference);
  const text =
    input.focusItem.originalPrompt ?? input.focusItem.prompt ?? input.focusItem.title;
  const thread = resolveMemoryThread(profile, text);
  const peers = itemsInSameThread(input.focusItem, input.items, input.reference);

  return {
    insight: buildThreadPatternInsight(
      input.focusItem,
      input.items,
      input.reference,
    ),
    thread,
    threadPeerCount: peers.length,
    profileArea: profile.area,
    profileType: describeMemoryType(profile.type),
    state: buildPatternStateSnapshot({
      items: input.items,
      reference: input.reference,
    }),
  };
}

export function buildRuntimeBrainState(input: {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference: Date;
  priorities?: string[];
}): SyncRuntimeBrainState {
  const { items, reference } = input;
  const hasUserContext = items.length > 0;
  const consequences = buildAllConsequences({
    items,
    workSchedule: input.workSchedule ?? null,
    reference,
  });
  const tomorrow = consequences.filter((entry) => entry.daysUntil === 1);
  const load = assessTomorrowLoad(consequences);

  const briefSnapshot = buildDailyBrief({
    items,
    workSchedule: input.workSchedule ?? null,
    reference,
  });

  const home = buildHomePriorities({
    consequences,
    items,
    reference,
    workSchedule: input.workSchedule ?? null,
    hasUserContext,
    priorities: input.priorities,
  });

  return {
    consequences: {
      count: consequences.length,
      tomorrowLoadLevel: tomorrow.length > 0 ? load.level : null,
      tomorrowLoadHeadline: headlineForTomorrowLoad(load, consequences),
    },
    brief: {
      lede: briefSnapshot.lede,
      lines: briefSnapshot.sections.flatMap((section) => section.paragraphs).slice(0, 8),
      isEmpty: briefSnapshot.isEmpty,
    },
    judgment: {
      primary: home.primaryPriority.text,
      supporting: home.supportingPriorities.map((line) => line.text),
      futureContext: home.futureContext?.text ?? null,
      reflection: home.reflection?.text ?? null,
      isQuiet: home.syncEngine.isQuiet,
      isEmpty: home.isEmpty,
      rankedCount: home.syncEngine.rankedLines.length,
    },
    responseEnginePrimary: home.syncEngine.primary.text,
  };
}

export function evaluateRuntimeBrain(input: {
  beforeItems: CapturedSyncItem[];
  afterItems: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference: Date;
  priorities?: string[];
  focusItem?: CapturedSyncItem | null;
}): SyncRuntimeBrainEvaluation {
  const before = buildRuntimeBrainState({
    items: input.beforeItems,
    workSchedule: input.workSchedule,
    reference: input.reference,
    priorities: input.priorities,
  });
  const after = buildRuntimeBrainState({
    items: input.afterItems,
    workSchedule: input.workSchedule,
    reference: input.reference,
    priorities: input.priorities,
  });

  const focusItem =
    input.focusItem ??
    (input.afterItems.length > 0 ? input.afterItems[0] : null);

  return {
    before,
    after,
    judgmentChanged:
      judgmentFingerprint(before.judgment) !== judgmentFingerprint(after.judgment),
    briefChanged: briefFingerprint(before.brief) !== briefFingerprint(after.brief),
    pattern: buildPatternSnapshot({
      focusItem,
      items: input.afterItems,
      reference: input.reference,
    }),
  };
}

export function emptyRuntimeBrainState(): SyncRuntimeBrainState {
  return {
    consequences: {
      count: 0,
      tomorrowLoadLevel: null,
      tomorrowLoadHeadline: null,
    },
    brief: {
      lede: "",
      lines: [],
      isEmpty: true,
    },
    judgment: {
      primary: "",
      supporting: [],
      futureContext: null,
      reflection: null,
      isQuiet: false,
      isEmpty: true,
      rankedCount: 0,
    },
    responseEnginePrimary: "",
  };
}

export function emptyRuntimeBrainEvaluation(): SyncRuntimeBrainEvaluation {
  const empty = emptyRuntimeBrainState();
  return {
    before: empty,
    after: empty,
    judgmentChanged: false,
    briefChanged: false,
    pattern: {
      insight: null,
      thread: null,
      threadPeerCount: 0,
      profileArea: null,
      profileType: null,
      state: {
        generatedAt: new Date(0).toISOString(),
        patterns: [],
        signals: [],
      },
    },
  };
}
