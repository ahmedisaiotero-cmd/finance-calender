import assert from "node:assert/strict";

import {
  formatSyncEngineOutcomeSummary,
  runAllSyncEngineTestSuites,
} from "@/lib/sync-engine/testing/test-runner";
import { ALL_SYNC_ENGINE_TEST_SUITES } from "@/lib/sync-engine/testing/fixtures";
import { SYNC_ENGINE_PHILOSOPHY_RULES } from "@/lib/sync-engine/testing/philosophy";

const run = runAllSyncEngineTestSuites();

assert.equal(ALL_SYNC_ENGINE_TEST_SUITES.length, 7);
assert.ok(SYNC_ENGINE_PHILOSOPHY_RULES.length >= 10);
assert.ok(run.summary.total >= 25);
assert.equal(
  run.summary.total,
  run.summary.passed +
    run.summary.failed +
    run.summary.warned +
    run.summary.knownGaps,
);

for (const suite of run.suites) {
  assert.ok(suite.cases.length > 0, `${suite.suiteId} should contain tests`);
  for (const testCase of suite.cases) {
    assert.ok(testCase.philosophyRules.length > 0, `${testCase.caseId} needs philosophy rules`);
    assert.ok(testCase.input.length > 0, `${testCase.caseId} needs input`);
    assert.ok(testCase.output.engineMode === "dryRun", `${testCase.caseId} should run in dryRun`);
  }
}

const security = run.suites.find((suite) => suite.suiteId === "security");
assert.ok(security);
assert.ok(
  security.cases.some((testCase) => testCase.status === "known_gap"),
  "security suite should expose known gaps instead of hiding them",
);

const summaryLine = formatSyncEngineOutcomeSummary(run.summary);
console.log(summaryLine);

assert.equal(
  run.summary.failed,
  0,
  `intelligence suite has real failures: ${summaryLine}`,
);
assert.equal(run.summary.shouldFailCommand, false);

console.log("sync-engine-intelligence-suite tests passed");
