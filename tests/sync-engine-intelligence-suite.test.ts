import assert from "node:assert/strict";

import { ALL_SYNC_ENGINE_TEST_SUITES } from "@/lib/sync-engine/testing/fixtures";
import { SYNC_ENGINE_PHILOSOPHY_RULES } from "@/lib/sync-engine/testing/philosophy";
import { runAllSyncEngineTestSuites } from "@/lib/sync-engine/testing/test-runner";

const run = runAllSyncEngineTestSuites();

assert.equal(ALL_SYNC_ENGINE_TEST_SUITES.length, 7);
assert.ok(SYNC_ENGINE_PHILOSOPHY_RULES.length >= 10);
assert.ok(run.summary.total >= 25);
assert.equal(
  run.summary.total,
  run.summary.passed + run.summary.failed + run.summary.warned,
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
  security.cases.some((testCase) => testCase.status === "warn"),
  "security suite should expose known gaps instead of hiding them",
);

console.log("sync-engine-intelligence-suite tests passed");
console.log(
  `summary: ${run.summary.passed} pass, ${run.summary.warned} warn, ${run.summary.failed} fail`,
);
