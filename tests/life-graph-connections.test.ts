import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildLifeGraphSnapshot,
  normalizeCapturedItem,
  normalizeCapturedItems,
  nodeIdForNormalizedObject,
} from "@/lib/intelligence/life-graph";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00.000Z");
const referenceDate = "2026-06-14";
const generatedAt = "2026-06-14T18:00:00.000Z";

function captureItem(text: string): CapturedSyncItem {
  const store = createTestCaptureStore();
  const result = captureFromBriefInput(
    text,
    { items: store.items, reference },
    store.handlers,
  );

  assert.ok(result, `expected brief capture to succeed for: ${text}`);
  assert.equal(store.items.length, 1);
  return store.items[0];
}

function nodeKinds(snapshot: ReturnType<typeof buildLifeGraphSnapshot>) {
  return snapshot.nodes.map((node) => node.kind);
}

function edgePairs(snapshot: ReturnType<typeof buildLifeGraphSnapshot>) {
  return snapshot.edges.map(
    (edge) => `${edge.kind}:${edge.fromNodeId}->${edge.toNodeId}`,
  );
}

function memoryNodeId(snapshot: ReturnType<typeof buildLifeGraphSnapshot>) {
  return snapshot.nodes.find((node) => node.kind === "memory")?.id;
}

function assertFuturePhaseArraysEmpty(
  snapshot: ReturnType<typeof buildLifeGraphSnapshot>,
) {
  assert.deepEqual(snapshot.interpretations, []);
  assert.deepEqual(snapshot.continuitySignals, []);
  assert.deepEqual(snapshot.continuityResolutions, []);
  assert.deepEqual(snapshot.beliefs, []);
}

function assertEveryNormalizedObjectHasNode(
  snapshot: ReturnType<typeof buildLifeGraphSnapshot>,
) {
  assert.equal(snapshot.nodes.length, snapshot.normalizedObjects.length);

  for (const object of snapshot.normalizedObjects) {
    const nodeId = nodeIdForNormalizedObject(object.id);
    const node = snapshot.nodes.find((entry) => entry.id === nodeId);
    assert.ok(node, `expected node for normalized object ${object.id}`);
    assert.equal(node.kind, object.kind);
    assert.equal(node.label, object.label);
  }
}

function assertNoInferredFutureNodes(
  snapshot: ReturnType<typeof buildLifeGraphSnapshot>,
) {
  const forbiddenKinds = new Set([
    "person",
    "project",
    "pattern",
    "belief",
    "decision",
    "routine",
    "place",
  ]);

  for (const node of snapshot.nodes) {
    assert.equal(
      forbiddenKinds.has(node.kind),
      false,
      `did not expect inferred ${node.kind} node yet`,
    );
  }
}

{
  const item = captureItem("I worked on Sync from 8pm to 10pm");
  const normalization = normalizeCapturedItem(item);
  const first = buildLifeGraphSnapshot({
    normalizations: [normalization],
    referenceDate,
    generatedAt,
  });
  const second = buildLifeGraphSnapshot({
    normalizations: [normalization],
    referenceDate,
    generatedAt,
  });

  assert.deepEqual(first, second, "graph projection should be deterministic");
  assert.deepEqual(nodeKinds(first), ["event", "memory"]);
  assertEveryNormalizedObjectHasNode(first);
  assertFuturePhaseArraysEmpty(first);
  assertNoInferredFutureNodes(first);

  const memoryId = memoryNodeId(first);
  const eventNodeId = first.nodes.find((node) => node.kind === "event")?.id;
  assert.ok(memoryId);
  assert.ok(eventNodeId);
  assert.ok(
    edgePairs(first).includes(`mentions:${memoryId}->${eventNodeId}`),
  );
}

{
  const item = captureItem("Payday is Friday");
  const normalization = normalizeCapturedItem(item);
  const snapshot = buildLifeGraphSnapshot({
    normalizations: [normalization],
    referenceDate,
    generatedAt,
  });

  assert.deepEqual(nodeKinds(snapshot), [
    "event",
    "financial_signal",
    "memory",
  ]);
  assertEveryNormalizedObjectHasNode(snapshot);
  assertFuturePhaseArraysEmpty(snapshot);

  const memoryId = memoryNodeId(snapshot);
  const eventNodeId = snapshot.nodes.find((node) => node.kind === "event")?.id;
  const financeNodeId = snapshot.nodes.find(
    (node) => node.kind === "financial_signal",
  )?.id;

  assert.ok(memoryId);
  assert.ok(eventNodeId);
  assert.ok(financeNodeId);
  assert.ok(edgePairs(snapshot).includes(`mentions:${memoryId}->${eventNodeId}`));
  assert.ok(
    edgePairs(snapshot).includes(`belongs_to:${memoryId}->${financeNodeId}`),
  );
}

{
  const item = captureItem("Mom's birthday is tomorrow");
  const normalization = normalizeCapturedItem(item);
  const snapshot = buildLifeGraphSnapshot({
    normalizations: [normalization],
    referenceDate,
    generatedAt,
  });

  assert.deepEqual(nodeKinds(snapshot), [
    "event",
    "memory",
    "relationship_signal",
  ]);
  assertEveryNormalizedObjectHasNode(snapshot);
  assertFuturePhaseArraysEmpty(snapshot);

  const memoryId = memoryNodeId(snapshot);
  const relationshipNodeId = snapshot.nodes.find(
    (node) => node.kind === "relationship_signal",
  )?.id;

  assert.ok(memoryId);
  assert.ok(relationshipNodeId);
  assert.ok(
    edgePairs(snapshot).includes(
      `belongs_to:${memoryId}->${relationshipNodeId}`,
    ),
  );
}

{
  const item = captureItem("I want to buy a Mustang");
  const normalization = normalizeCapturedItem(item);
  const snapshot = buildLifeGraphSnapshot({
    normalizations: [normalization],
    referenceDate,
    generatedAt,
  });

  assert.deepEqual(nodeKinds(snapshot), ["goal", "memory"]);
  assertEveryNormalizedObjectHasNode(snapshot);
  assertFuturePhaseArraysEmpty(snapshot);

  const memoryId = memoryNodeId(snapshot);
  const goalNodeId = snapshot.nodes.find((node) => node.kind === "goal")?.id;

  assert.ok(memoryId);
  assert.ok(goalNodeId);
  assert.ok(edgePairs(snapshot).includes(`belongs_to:${memoryId}->${goalNodeId}`));
}

{
  const item = captureItem("I spent less this month");
  const normalization = normalizeCapturedItem(item);
  const snapshot = buildLifeGraphSnapshot({
    normalizations: [normalization],
    referenceDate,
    generatedAt,
  });

  assert.deepEqual(nodeKinds(snapshot), [
    "event",
    "financial_signal",
    "memory",
  ]);
  assertEveryNormalizedObjectHasNode(snapshot);
  assertFuturePhaseArraysEmpty(snapshot);
}

{
  const store = createTestCaptureStore();
  const examples = [
    "I worked on Sync from 8pm to 10pm",
    "Payday is Friday",
    "Mom's birthday is tomorrow",
    "I want to buy a Mustang",
    "I spent less this month",
  ];

  for (const text of examples) {
    captureFromBriefInput(
      text,
      { items: store.items, reference },
      store.handlers,
    );
  }

  const normalizations = normalizeCapturedItems(store.items);
  const consequences = buildAllConsequences({
    items: store.items,
    reference,
  });
  const snapshot = buildLifeGraphSnapshot({
    normalizations,
    consequences,
    referenceDate,
    generatedAt,
  });

  assert.equal(snapshot.observations.length, examples.length);
  assert.equal(
    snapshot.nodes.length,
    snapshot.normalizedObjects.length + consequences.length,
  );
  assertFuturePhaseArraysEmpty(snapshot);
  assertNoInferredFutureNodes(snapshot);

  const consequenceEdges = snapshot.edges.filter(
    (edge) => edge.kind === "consequence_of",
  );
  assert.ok(consequenceEdges.length > 0);

  for (const edge of consequenceEdges) {
    assert.ok(edge.fromNodeId.startsWith("node_consequence_"));
    assert.ok(edge.toNodeId.startsWith("node_norm_memory_"));
    assert.equal(edge.evidenceMemoryIds.length, 1);
  }
}

console.log("life-graph connection tests passed");
