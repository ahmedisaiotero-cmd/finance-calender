import type { CapturedSyncItem } from "@/lib/captured-items";
import type { SyncEngineBehaviorExpectation } from "@/lib/sync-engine/testing/expected-behavior";

export type SyncEngineTestCategory =
  | "memory"
  | "consequence"
  | "relationship"
  | "pattern"
  | "follow-up"
  | "contradiction"
  | "security";

export type SyncEngineTestCase = SyncEngineBehaviorExpectation & {
  id: string;
  title: string;
  category: SyncEngineTestCategory;
  input?: string;
  sequence?: string[];
  seedMemories?: CapturedSyncItem[];
  notes?: string;
};

export function isSequenceTest(testCase: SyncEngineTestCase) {
  return Array.isArray(testCase.sequence) && testCase.sequence.length > 0;
}
