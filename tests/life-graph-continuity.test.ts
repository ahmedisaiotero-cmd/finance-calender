import assert from "node:assert/strict";

import {
  buildLifeGraphSnapshot,
  deriveContinuitySignals,
  normalizeCapturedItems,
  runReasoningEngine,
} from "@/lib/intelligence/life-graph";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00.000Z");
const referenceDate = "2026-06-14";
const generatedAt = "2026-06-14T18:00:00.000Z";

function buildSnapshotFromTexts(texts: string[]) {
  const store = createTestCaptureStore();

  for (const text of texts) {
    const result = captureFromBriefInput(
      text,
      { items: store.items, reference },
      store.handlers,
    );
    assert.ok(result, `expected capture to succeed for: ${text}`);
  }

  return buildLifeGraphSnapshot({
    normalizations: normalizeCapturedItems(store.items),
    referenceDate,
    generatedAt,
  });
}

function signalsOfKind(
  snapshot: ReturnType<typeof buildSnapshotFromTexts>,
  kind: string,
) {
  return deriveContinuitySignals(snapshot).filter(
    (signal) => signal.kind === kind,
  );
}

function assertNoFutureReasoningArtifacts(
  snapshot: ReturnType<typeof buildSnapshotFromTexts>,
) {
  assert.deepEqual(snapshot.interpretations, []);
  assert.deepEqual(snapshot.continuityResolutions, []);
  assert.deepEqual(snapshot.beliefs, []);
  assert.deepEqual(snapshot.continuitySignals, []);
}

{
  const snapshot = buildSnapshotFromTexts([
    "Payday is Friday",
    "I spent less this month",
  ]);
  const signals = deriveContinuitySignals(snapshot);
  const first = deriveContinuitySignals(snapshot);
  const second = deriveContinuitySignals(snapshot);

  assert.deepEqual(first, second, "continuity output should be deterministic");
  assert.ok(signals.some((signal) => signal.kind === "recurring_theme"));
  assert.ok(
    signals.some(
      (signal) =>
        signal.kind === "recurring_theme" &&
        signal.summary.includes("Money"),
    ),
  );
  assert.equal(
    signals.find((signal) => signal.kind === "recurring_theme")?.decisionRelevance,
    "medium",
  );
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts([
    "I want to buy a Mustang",
    "Still thinking about getting a Mustang",
  ]);
  const resurfaced = signalsOfKind(snapshot, "resurfaced_goal");

  assert.equal(resurfaced.length, 1);
  assert.equal(resurfaced[0]?.confidence, "medium");
  assert.ok(resurfaced[0]?.summary.toLowerCase().includes("mustang"));
  assert.ok((resurfaced[0]?.memoryIds.length ?? 0) >= 2);
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["I keep delaying cancelling Uber"]);
  const delayed = signalsOfKind(snapshot, "delayed_decision");

  assert.equal(delayed.length, 1);
  assert.equal(delayed[0]?.confidence, "medium");
  assert.equal(delayed[0]?.decisionRelevance, "high");
  assert.ok(delayed[0]?.summary.toLowerCase().includes("uber"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["I still need to cancel Uber"]);
  const unfinished = signalsOfKind(snapshot, "unfinished_loop");

  assert.equal(unfinished.length, 1);
  assert.equal(unfinished[0]?.decisionRelevance, "high");
  assert.ok(unfinished[0]?.summary.toLowerCase().includes("uber"));
  assert.equal(signalsOfKind(snapshot, "delayed_decision").length, 0);
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["I spent less this month"]);
  const improvements = signalsOfKind(snapshot, "improvement");

  assert.equal(improvements.length, 1);
  assert.equal(improvements[0]?.decisionRelevance, "low");
  assert.ok(improvements[0]?.summary.toLowerCase().includes("spending"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["I overspent again"]);
  const regressions = signalsOfKind(snapshot, "regression");

  assert.equal(regressions.length, 1);
  assert.equal(regressions[0]?.decisionRelevance, "low");
  assert.ok(regressions[0]?.summary.toLowerCase().includes("spending"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["Mom's birthday is tomorrow"]);
  const signals = deriveContinuitySignals(snapshot);

  assert.equal(signals.length, 0);
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts([
    "Payday is Friday",
    "I spent less this month",
  ]);
  const reasoning = runReasoningEngine(snapshot);

  assert.ok(reasoning.continuitySignals.length > 0);
  assert.deepEqual(
    reasoning.continuitySignals,
    deriveContinuitySignals(snapshot),
  );

  for (const signal of reasoning.continuitySignals) {
    assert.ok(signal.nodeIds.length > 0);
    assert.ok(signal.memoryIds.length > 0);
    assert.match(signal.summary, /^(?!.*\b(node|edge|graph|traversal)\b).+$/i);
  }
}

console.log("life-graph continuity tests passed");
