import assert from "node:assert/strict";

import {
  buildLifeGraphSnapshot,
  deriveContinuitySignals,
  normalizeCapturedItems,
  resolveContinuity,
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

function resolutionsOfStatus(
  snapshot: ReturnType<typeof buildSnapshotFromTexts>,
  status: string,
) {
  const signals = deriveContinuitySignals(snapshot);
  return resolveContinuity(snapshot, signals).filter(
    (resolution) => resolution.status === status,
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

function patchMemoryCreatedAt(
  store: ReturnType<typeof createTestCaptureStore>,
  promptIncludes: string,
  createdAt: string,
) {
  const item = store.items.find((entry) =>
    (entry.originalPrompt ?? entry.prompt)
      .toLowerCase()
      .includes(promptIncludes.toLowerCase()),
  );
  if (item) {
    item.createdAt = createdAt;
  }
}

{
  const snapshot = buildSnapshotFromTexts(["I keep delaying cancelling Uber"]);
  const stalled = resolutionsOfStatus(snapshot, "stalled");

  assert.equal(stalled.length, 1);
  assert.equal(stalled[0]?.confidence, "medium");
  assert.ok(stalled[0]?.reason.toLowerCase().includes("delayed"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["I still need to cancel Uber"]);
  const stalled = resolutionsOfStatus(snapshot, "stalled");

  assert.equal(stalled.length, 1);
  assert.ok(stalled[0]?.reason.toLowerCase().includes("unresolved"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["I finally cancelled Uber"]);
  const completed = resolutionsOfStatus(snapshot, "completed");

  assert.equal(completed.length, 1);
  assert.ok(completed[0]?.reason.toLowerCase().includes("uber"));
  assert.equal(resolutionsOfStatus(snapshot, "stalled").length, 0);
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["I am done with the vending idea"]);
  const archived = resolutionsOfStatus(snapshot, "archived");

  assert.equal(archived.length, 1);
  assert.ok(archived[0]?.reason.toLowerCase().includes("vending"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput(
    "I thought about the vending business again",
    { items: store.items, reference },
    store.handlers,
  );
  captureFromBriefInput(
    "I am done with the vending idea",
    { items: store.items, reference },
    store.handlers,
  );

  patchMemoryCreatedAt(
    store,
    "thought about the vending business",
    "2026-01-01T00:00:00.000Z",
  );
  patchMemoryCreatedAt(store, "done with the vending idea", "2026-06-01T00:00:00.000Z");

  const snapshot = buildLifeGraphSnapshot({
    normalizations: normalizeCapturedItems(store.items),
    referenceDate,
    generatedAt,
  });
  const signals = deriveContinuitySignals(snapshot);
  const resolutions = resolveContinuity(snapshot, signals);
  const historical = resolutions.filter(
    (resolution) => resolution.status === "historical_context",
  );

  assert.ok(historical.length >= 1);
  assert.ok(
    historical.some((resolution) =>
      resolution.reason.toLowerCase().includes("vending"),
    ),
  );
  assert.ok(
    resolutions.some((resolution) => resolution.status === "archived"),
  );
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts([
    "I want to buy a Mustang",
    "Still thinking about getting a Mustang",
  ]);
  const resurfacing = resolutionsOfStatus(snapshot, "resurfacing");

  assert.equal(resurfacing.length, 1);
  assert.ok(resurfacing[0]?.evidenceNodeIds.length >= 2);
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["I worked on Sync again this week"]);
  const active = resolutionsOfStatus(snapshot, "active");

  assert.equal(active.length, 1);
  assert.ok(active[0]?.reason.toLowerCase().includes("project"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["That goal does not matter anymore"]);
  const dismissed = resolutionsOfStatus(snapshot, "no_longer_relevant");

  assert.equal(dismissed.length, 1);
  assert.ok(dismissed[0]?.reason.toLowerCase().includes("no longer relevant"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts([
    "I changed my mind about buying a Mustang",
  ]);
  const contradicted = resolutionsOfStatus(snapshot, "contradicted");

  assert.equal(contradicted.length, 1);
  assert.ok(contradicted[0]?.reason.toLowerCase().includes("mustang"));
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts(["Mom's birthday is tomorrow"]);
  const signals = deriveContinuitySignals(snapshot);
  const first = resolveContinuity(snapshot, signals);
  const second = resolveContinuity(snapshot, signals);

  assert.deepEqual(first, second, "resolution output should be deterministic");
  assert.equal(first.length, 0);
  assertNoFutureReasoningArtifacts(snapshot);
}

{
  const snapshot = buildSnapshotFromTexts([
    "Payday is Friday",
    "I spent less this month",
  ]);
  const reasoning = runReasoningEngine(snapshot);

  assert.ok(reasoning.continuitySignals.length > 0);
  assert.ok(reasoning.continuityResolutions.length > 0);
  assert.deepEqual(
    reasoning.continuitySignals,
    deriveContinuitySignals(snapshot),
  );
  assert.deepEqual(
    reasoning.continuityResolutions,
    resolveContinuity(snapshot, reasoning.continuitySignals),
  );
  assert.deepEqual(snapshot.interpretations, []);
  assert.deepEqual(snapshot.beliefs, []);
}

console.log("life-graph continuity resolution tests passed");
