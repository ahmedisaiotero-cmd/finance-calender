import assert from "node:assert/strict";

import {
  buildDecisionGraphContext,
  buildLifeGraphSnapshot,
  buildNarrativeContext,
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

function buildChain(texts: string[]) {
  const snapshot = buildSnapshotFromTexts(texts);
  const reasoning = runReasoningEngine(snapshot);
  const decisionContext = buildDecisionGraphContext(snapshot, reasoning);
  const narrativeContext = buildNarrativeContext(decisionContext, snapshot, reasoning);
  return { snapshot, reasoning, decisionContext, narrativeContext };
}

{
  const { reasoning, decisionContext, narrativeContext } = buildChain([
    "I keep delaying cancelling Uber",
    "Payday is Friday",
    "I spent less this month",
  ]);

  assert.ok(reasoning.continuitySignals.length > 0);
  assert.ok(reasoning.continuityResolutions.length > 0);
  assert.ok(reasoning.interpretations.length > 0);
  assert.ok(reasoning.beliefs.length > 0);
  assert.ok(decisionContext.relevantNodeIds.length > 0);
  assert.equal(narrativeContext.preserveDecisionOrder, true);
}

{
  const { reasoning } = buildChain([
    "I keep delaying cancelling Uber",
    "I finally cancelled Uber",
  ]);
  assert.ok(
    reasoning.continuityResolutions.some((resolution) => resolution.status === "completed"),
  );
  assert.equal(
    reasoning.continuityResolutions.some((resolution) => resolution.status === "stalled"),
    false,
  );
}

{
  const { reasoning } = buildChain([
    "I thought about the vending business again",
    "I am done with the vending idea",
  ]);
  assert.ok(
    reasoning.continuityResolutions.some(
      (resolution) =>
        resolution.status === "archived" ||
        resolution.status === "historical_context",
    ),
  );
  assert.equal(
    reasoning.beliefs.some(
      (belief) => /vending/i.test(belief.statement) && belief.status === "active",
    ),
    false,
  );
}

{
  const { narrativeContext } = buildChain([
    "I want to buy a Mustang",
    "Still thinking about getting a Mustang",
  ]);
  assert.ok(
    narrativeContext.forbiddenClaims.some((claim) =>
      /stated car goal a recommendation/i.test(claim),
    ),
  );
}

{
  const { reasoning } = buildChain(["Payday is Friday", "I spent less this month"]);
  assert.equal(
    reasoning.beliefs.some((belief) => /bad with money/i.test(belief.statement)),
    false,
  );
}

{
  const { reasoning } = buildChain(["I ate lunch"]);
  assert.equal(reasoning.beliefs.length, 0);
}

{
  const chain = buildChain(["Payday is Friday", "I keep delaying cancelling Uber"]);
  for (const interpretation of chain.reasoning.interpretations) {
    assert.ok(interpretation.evidenceNodeIds.length > 0);
  }
  for (const belief of chain.reasoning.beliefs) {
    assert.ok(belief.evidenceNodeIds.length > 0);
  }
}

{
  const { narrativeContext, snapshot, decisionContext } = buildChain([
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);
  assert.equal(
    narrativeContext.evidenceLines.some((line) =>
      /\b(graph|node|edge|traversal|projection)\b/i.test(line),
    ),
    false,
  );
  assert.equal(snapshot.interpretations.length, 0);
  assert.equal(snapshot.beliefs.length, 0);
  assert.equal(typeof decisionContext.snapshotId, "string");
}

console.log("sync intelligence foundation tests passed");
