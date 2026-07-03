import assert from "node:assert/strict";

import {
  buildDecisionGraphContext,
  buildLifeGraphSnapshot,
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

{
  const snapshot = buildSnapshotFromTexts(["I keep delaying cancelling Uber"]);
  const reasoning = runReasoningEngine(snapshot);
  const context = buildDecisionGraphContext(snapshot, reasoning);

  const stalledResolution = context.continuityResolutions.find(
    (resolution) => resolution.status === "stalled",
  );
  assert.ok(stalledResolution, "expected a stalled Uber resolution");
  assert.ok(context.relevantNodeIds.includes(stalledResolution.targetNodeId));
}

{
  const snapshot = buildSnapshotFromTexts([
    "I keep delaying cancelling Uber",
    "I finally cancelled Uber",
  ]);
  const reasoning = runReasoningEngine(snapshot);
  const context = buildDecisionGraphContext(snapshot, reasoning);

  assert.ok(
    context.continuityResolutions.some(
      (resolution) => resolution.status === "completed",
    ),
  );
  assert.equal(
    context.continuityResolutions.some((resolution) => resolution.status === "stalled"),
    false,
  );
}

{
  const snapshot = buildSnapshotFromTexts([
    "I want to buy a Mustang",
    "Still thinking about getting a Mustang",
  ]);
  const context = buildDecisionGraphContext(snapshot, runReasoningEngine(snapshot));

  const resurfacing = context.continuityResolutions.find(
    (resolution) => resolution.status === "resurfacing",
  );
  assert.ok(resurfacing, "expected a resurfacing goal resolution");
  assert.ok(context.relevantNodeIds.includes(resurfacing.targetNodeId));
}

{
  const snapshot = buildSnapshotFromTexts([
    "I thought about the vending business again",
    "I am done with the vending idea",
  ]);
  const context = buildDecisionGraphContext(snapshot, runReasoningEngine(snapshot));

  assert.ok(
    context.continuityResolutions.some(
      (resolution) =>
        resolution.status === "archived" ||
        resolution.status === "historical_context",
    ),
  );
  assert.equal(
    context.beliefs.some(
      (belief) =>
        /vending/i.test(belief.statement) && belief.status === "active",
    ),
    false,
  );
}

{
  const snapshot = buildSnapshotFromTexts([
    "I worked on Sync from 8pm to 10pm",
    "I made progress on Sync",
  ]);
  const context = buildDecisionGraphContext(snapshot, runReasoningEngine(snapshot));

  assert.ok(
    context.beliefs.some(
      (belief) =>
        /sync appears to be an active project/i.test(belief.statement) &&
        (belief.status === "active" || belief.status === "watching"),
    ),
  );
}

{
  const snapshot = buildSnapshotFromTexts(["I ate lunch"]);
  const context = buildDecisionGraphContext(snapshot, runReasoningEngine(snapshot));

  assert.ok(context.relevantNodeIds.length <= 1);
}

{
  const snapshot = buildSnapshotFromTexts([
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);
  const reasoning = runReasoningEngine(snapshot);
  const first = buildDecisionGraphContext(snapshot, reasoning);
  const second = buildDecisionGraphContext(snapshot, reasoning);

  assert.deepEqual(first, second, "decision context should be deterministic");
}

{
  const snapshot = buildSnapshotFromTexts([
    "Payday is Friday",
    "I spent less this month",
  ]);
  const snapshotBefore = JSON.stringify(snapshot);
  const reasoningBefore = runReasoningEngine(snapshot);
  const reasoningStringBefore = JSON.stringify(reasoningBefore);

  const context = buildDecisionGraphContext(snapshot, reasoningBefore);

  assert.ok(context.interpretationIds.length >= 0);
  assert.equal(JSON.stringify(snapshot), snapshotBefore, "snapshot should not be mutated");
  assert.equal(
    JSON.stringify(reasoningBefore),
    reasoningStringBefore,
    "reasoning output should not be mutated",
  );
}

{
  const snapshot = buildSnapshotFromTexts([
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);
  const reasoning = runReasoningEngine(snapshot);
  const context = buildDecisionGraphContext(snapshot, reasoning);

  assert.ok(reasoning.continuitySignals.length > 0);
  assert.ok(reasoning.continuityResolutions.length > 0);
  assert.ok(reasoning.interpretations.length > 0);
  assert.ok(reasoning.beliefs.length > 0);
  assert.equal(typeof context.snapshotId, "string");
}

console.log("life-graph decision context tests passed");
