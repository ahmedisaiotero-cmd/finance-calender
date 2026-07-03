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

function buildContext(texts: string[]) {
  const snapshot = buildSnapshotFromTexts(texts);
  const reasoning = runReasoningEngine(snapshot);
  const decisionContext = buildDecisionGraphContext(snapshot, reasoning);
  const narrativeContext = buildNarrativeContext(decisionContext, snapshot, reasoning);
  return { snapshot, reasoning, decisionContext, narrativeContext };
}

{
  const { narrativeContext } = buildContext(["I keep delaying cancelling Uber"]);
  assert.equal(narrativeContext.preferredTone, "direct");
  assert.ok(
    narrativeContext.evidenceLines.some((line) => /uber cancellation appears unresolved/i.test(line)),
  );
  assert.ok(
    narrativeContext.forbiddenClaims.some((claim) => /already complete/i.test(claim)),
  );
}

{
  const { narrativeContext } = buildContext([
    "I keep delaying cancelling Uber",
    "I finally cancelled Uber",
  ]);
  assert.equal(narrativeContext.preferredTone, "direct");
  assert.ok(
    narrativeContext.evidenceLines.some((line) => /uber cancellation appears completed/i.test(line)),
  );
  assert.ok(
    narrativeContext.forbiddenClaims.some((claim) =>
      /unresolved after completion evidence/i.test(claim),
    ),
  );
}

{
  const { narrativeContext } = buildContext([
    "I want to buy a Mustang",
    "Still thinking about getting a Mustang",
  ]);
  assert.ok(
    narrativeContext.evidenceLines.some((line) => /mustang goal has resurfaced/i.test(line)),
  );
  assert.ok(
    narrativeContext.forbiddenClaims.some((claim) =>
      /stated car goal a recommendation/i.test(claim),
    ),
  );
}

{
  const { narrativeContext } = buildContext([
    "I thought about the vending business again",
    "I am done with the vending idea",
  ]);
  assert.ok(
    narrativeContext.evidenceLines.some((line) =>
      /vending idea appears archived/i.test(line),
    ),
  );
  assert.ok(
    narrativeContext.forbiddenClaims.some((claim) =>
      /archived ideas as active goals/i.test(claim),
    ),
  );
}

{
  const { narrativeContext } = buildContext([
    "I worked on Sync from 8pm to 10pm",
    "I made progress on Sync",
  ]);
  assert.equal(narrativeContext.preferredTone, "calm");
  assert.ok(
    narrativeContext.evidenceLines.some((line) => /sync appears to be an active project/i.test(line)),
  );
}

{
  const { narrativeContext } = buildContext([
    "Payday is Friday",
    "I spent less this month",
  ]);
  assert.equal(narrativeContext.preferredTone, "calm");
  assert.ok(
    narrativeContext.evidenceLines.some((line) =>
      /money has been a recurring area of attention/i.test(line),
    ),
  );
  assert.ok(
    narrativeContext.evidenceLines.some((line) =>
      /payday may matter because of upcoming money timing/i.test(line),
    ),
  );
}

{
  const { narrativeContext } = buildContext(["Mom's birthday is tomorrow"]);
  assert.equal(narrativeContext.preferredTone, "gentle");
  assert.ok(
    narrativeContext.evidenceLines.some((line) => /family timing/i.test(line)),
  );
}

{
  const { narrativeContext } = buildContext(["I ate lunch"]);
  assert.equal(narrativeContext.preferredTone, "uncertain");
  assert.ok(narrativeContext.evidenceLines.length <= 1);
}

{
  const built = buildContext([
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);
  const first = buildNarrativeContext(
    built.decisionContext,
    built.snapshot,
    built.reasoning,
  );
  const second = buildNarrativeContext(
    built.decisionContext,
    built.snapshot,
    built.reasoning,
  );
  assert.deepEqual(first, second, "narrative context should be deterministic");
}

{
  const { narrativeContext } = buildContext([
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);
  assert.equal(
    narrativeContext.evidenceLines.some((line) =>
      /\b(graph|node|edge|traversal|projection)\b/i.test(line),
    ),
    false,
  );
}

{
  const { narrativeContext } = buildContext([
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);
  assert.equal(narrativeContext.preserveDecisionOrder, true);
}

{
  const { snapshot, decisionContext, reasoning } = buildContext([
    "Payday is Friday",
    "I spent less this month",
  ]);
  const snapshotBefore = JSON.stringify(snapshot);
  const contextBefore = JSON.stringify(decisionContext);
  const reasoningBefore = JSON.stringify(reasoning);

  const narrativeContext = buildNarrativeContext(decisionContext, snapshot, reasoning);
  assert.ok(narrativeContext.evidenceLines.length >= 0);

  assert.equal(JSON.stringify(snapshot), snapshotBefore);
  assert.equal(JSON.stringify(decisionContext), contextBefore);
  assert.equal(JSON.stringify(reasoning), reasoningBefore);
}

console.log("life-graph narrative context tests passed");
