import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  normalizeCapturedItem,
  normalizeCapturedItems,
} from "@/lib/intelligence/life-graph";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00.000Z");

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

function objectKinds(normalization: ReturnType<typeof normalizeCapturedItem>) {
  return normalization.objects.map((object) => object.kind);
}

{
  const item = captureItem("I worked on Sync from 8pm to 10pm");
  const first = normalizeCapturedItem(item);
  const second = normalizeCapturedItem(item);

  assert.deepEqual(first, second, "normalization should be deterministic");
  assert.equal(first.observation.source, "manual_text");
  assert.equal(first.observation.sourceId, item.id);
  assert.equal(
    first.observation.rawContent,
    item.originalPrompt ?? item.prompt,
  );
  assert.equal(first.observation.observedAt, item.createdAt);
  assert.equal(first.observation.metadata?.title, "Project work");
  assert.equal(first.observation.metadata?.prompt, item.prompt);
  assert.equal(
    (first.observation.metadata?.meaning as { importance?: string } | undefined)
      ?.importance,
    "medium",
  );
  assert.deepEqual(first.observation.metadata?.destinations, ["Work", "Calendar"]);

  assert.deepEqual(objectKinds(first), ["memory", "event"]);
  assert.equal(first.objects[0]?.kind, "memory");
  assert.equal(first.objects[0]?.memoryId, item.id);
  assert.equal(first.objects[0]?.label, "Project work");
  assert.equal(first.objects[0]?.attributes?.importance, "medium");
  assert.equal(first.objects[1]?.kind, "event");
  assert.equal(first.objects[1]?.attributes?.startTime, "20:00");
  assert.equal(first.objects[1]?.attributes?.endTime, "22:00");
  assert.equal(first.objects[1]?.attributes?.timelineRole, "log");
}

{
  const item = captureItem("Payday is Friday");
  const normalized = normalizeCapturedItem(item);

  assert.equal(normalized.observation.rawContent, item.originalPrompt ?? item.prompt);
  assert.equal(normalized.observation.metadata?.title, "Payday");
  assert.deepEqual(normalized.observation.metadata?.destinations, [
    "Finance",
    "Calendar",
  ]);
  assert.equal(normalized.observation.confidence, "medium");

  assert.deepEqual(objectKinds(normalized), [
    "memory",
    "event",
    "financial_signal",
  ]);
  assert.ok(normalized.objects[1]?.dateKey ?? normalized.objects[1]?.attributes?.startDate);
  assert.equal(normalized.objects[2]?.kind, "financial_signal");
  assert.equal(normalized.objects[2]?.label, "Finance");
}

{
  const item = captureItem("Mom's birthday is tomorrow");
  const normalized = normalizeCapturedItem(item);

  assert.equal(normalized.observation.rawContent, item.originalPrompt ?? item.prompt);
  assert.equal(normalized.observation.confidence, "high");
  assert.equal(normalized.observation.metadata?.title, "Mom's Birthday");
  assert.deepEqual(normalized.observation.metadata?.destinations, [
    "Family",
    "Calendar",
  ]);

  assert.deepEqual(objectKinds(normalized), [
    "memory",
    "event",
    "relationship_signal",
  ]);
  assert.equal(normalized.objects[0]?.attributes?.importance, "high");
  assert.equal(normalized.objects[2]?.kind, "relationship_signal");
  assert.equal(normalized.objects[2]?.label, "Family");
}

{
  const item = captureItem("I want to buy a Mustang");
  const normalized = normalizeCapturedItem(item);

  assert.equal(normalized.observation.rawContent, item.originalPrompt ?? item.prompt);
  assert.equal(normalized.observation.confidence, "low");
  assert.deepEqual(normalized.observation.metadata?.destinations, ["Goals"]);

  assert.deepEqual(objectKinds(normalized), ["memory", "goal"]);
  assert.equal(normalized.objects[0]?.label, "Personal Goal");
  assert.equal(normalized.objects[1]?.kind, "goal");
  assert.equal(normalized.objects[1]?.label, "Goals");
}

{
  const item = captureItem("I spent less this month");
  const normalized = normalizeCapturedItem(item);

  assert.equal(normalized.observation.rawContent, item.originalPrompt ?? item.prompt);
  assert.equal(normalized.observation.metadata?.title, "Small Purchase");
  assert.deepEqual(normalized.observation.metadata?.destinations, ["Finance"]);

  assert.deepEqual(objectKinds(normalized), [
    "memory",
    "event",
    "financial_signal",
  ]);
  assert.equal(normalized.objects[0]?.attributes?.importance, "medium");
  assert.equal(normalized.objects[2]?.kind, "financial_signal");
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

  const batch = normalizeCapturedItems(store.items);
  assert.equal(batch.length, examples.length);
  for (const entry of batch) {
    assert.ok(entry.observation.id.startsWith("obs_"));
    assert.ok(entry.objects.length >= 1);
    assert.equal(entry.objects[0]?.kind, "memory");
    assert.equal(entry.objects[0]?.observationId, entry.observation.id);
  }
}

console.log("life-graph normalization tests passed");
