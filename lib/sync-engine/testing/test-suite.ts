import type {
  SyncEngineTestCase,
  SyncEngineTestCategory,
} from "@/lib/sync-engine/testing/test-case";

export type SyncEngineTestSuite = {
  id: string;
  title: string;
  category: SyncEngineTestCategory;
  goal: string;
  cases: SyncEngineTestCase[];
};

export function countSuiteCases(suites: SyncEngineTestSuite[]) {
  return suites.reduce((total, suite) => total + suite.cases.length, 0);
}
