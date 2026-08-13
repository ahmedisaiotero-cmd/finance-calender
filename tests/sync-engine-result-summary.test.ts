import assert from "node:assert/strict";

import {
  classifySyncEngineCaseStatus,
  formatSyncEngineOutcomeSummary,
  summarizeSyncEngineOutcomes,
} from "@/lib/sync-engine/testing/result-summary";

{
  const summary = summarizeSyncEngineOutcomes([
    { status: "pass" },
    { status: "pass" },
  ]);
  assert.deepEqual(summary, {
    total: 2,
    passed: 2,
    warned: 0,
    knownGaps: 0,
    failed: 0,
    shouldFailCommand: false,
  });
}

{
  const summary = summarizeSyncEngineOutcomes([
    { status: "pass" },
    { status: "warn" },
    { status: "warn" },
  ]);
  assert.equal(summary.passed, 1);
  assert.equal(summary.warned, 2);
  assert.equal(summary.knownGaps, 0);
  assert.equal(summary.failed, 0);
  assert.equal(summary.shouldFailCommand, false);
}

{
  const summary = summarizeSyncEngineOutcomes([
    { status: "pass" },
    { status: "known_gap" },
    { status: "known_gap" },
  ]);
  assert.equal(summary.passed, 1);
  assert.equal(summary.knownGaps, 2);
  assert.equal(summary.failed, 0);
  assert.equal(summary.shouldFailCommand, false);
  assert.equal(
    formatSyncEngineOutcomeSummary(summary),
    "1 pass, 0 warn, 2 known gap, 0 fail",
  );
}

{
  const summary = summarizeSyncEngineOutcomes([
    { status: "pass" },
    { status: "known_gap" },
    { status: "fail" },
  ]);
  assert.equal(summary.passed, 1);
  assert.equal(summary.knownGaps, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.shouldFailCommand, true);
}

{
  assert.equal(
    classifySyncEngineCaseStatus({ mismatchCount: 0, hasKnownGap: false }),
    "pass",
  );
  assert.equal(
    classifySyncEngineCaseStatus({ mismatchCount: 2, hasKnownGap: true }),
    "known_gap",
  );
  assert.equal(
    classifySyncEngineCaseStatus({ mismatchCount: 1, hasKnownGap: false }),
    "fail",
  );
  assert.equal(
    classifySyncEngineCaseStatus({ mismatchCount: 0, hasKnownGap: true }),
    "pass",
  );
}

{
  // Known gaps are never passes or failures.
  const summary = summarizeSyncEngineOutcomes([{ status: "known_gap" }]);
  assert.equal(summary.passed, 0);
  assert.equal(summary.failed, 0);
  assert.equal(summary.knownGaps, 1);
  assert.equal(summary.shouldFailCommand, false);
}

console.log("sync-engine-result-summary tests passed");
