import type {
  SyncEngineAffectedTimeframe,
  SyncEngineMemoryDecision,
} from "@/lib/sync-engine";
import type { SyncEnginePhilosophyRuleId } from "@/lib/sync-engine/testing/philosophy";

export type SyncEngineConfidenceRange = {
  min?: number;
  max?: number;
};

export type SyncEngineExpectedBehavior = {
  shouldRemember?: boolean;
  category?: string;
  importance?: string | string[];
  surfaceLater?: boolean;
  followUpDecision?: string;
  confidenceRange?: SyncEngineConfidenceRange;
  consequenceSummary?: RegExp | string;
  affectedTimeframe?: SyncEngineAffectedTimeframe;
  priorityImpact?: "none" | "low" | "medium" | "high";
  shouldSurfaceInBrief?: boolean;
  relatedMemoryExpected?: boolean;
  personDetected?: boolean;
  relationshipDetected?: boolean;
  futureUsefulness?: boolean;
  followUpNeeded?: boolean;
  askNow?: boolean;
  noAsk?: boolean;
  followUpQuestion?: RegExp | string;
  reason?: RegExp | string;
  patternDetected?: boolean;
  patternType?: string;
  importanceIncreased?: boolean;
  responseShouldMentionPattern?: boolean;
  contradictionDetected?: boolean;
  conflictingMemoryIds?: boolean;
  askClarifyingQuestion?: boolean;
  updateCandidate?: boolean;
  memoryDecision?: SyncEngineMemoryDecision;
  shouldRejectSensitiveStorage?: boolean;
  shouldAvoidSecretInDebug?: boolean;
  shouldNotRevealAllMemory?: boolean;
};

export type SyncEngineKnownGap = {
  reason: string;
};

export type SyncEngineBehaviorExpectation = {
  expected: SyncEngineExpectedBehavior;
  philosophyRules: SyncEnginePhilosophyRuleId[];
  knownGap?: SyncEngineKnownGap;
};
