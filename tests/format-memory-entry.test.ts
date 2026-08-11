import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { findRelatedMemories } from "@/lib/mobile-prototype/build-memory-detail";
import { buildMemoryEntries } from "@/lib/mobile-prototype/format-memory-entry";
import {
  attemptBriefCapture,
  captureFromBriefInput,
} from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";
import { createTestTimelineResolution } from "@/tests/test-fixtures";

const reference = new Date("2026-06-14T18:00:00");

function capture(text: string) {
  const store = createTestCaptureStore();
  const result = captureFromBriefInput(text, { items: store.items, reference }, store.handlers);
  assert.ok(result, `expected capture for: ${text}`);
  return { store, result: result! };
}

function paydayItem(id: string, createdAt: string): CapturedSyncItem {
  return {
    id,
    title: "Payday",
    category: "expense",
    prompt: "I get paid Friday",
    originalPrompt: "I get paid Friday",
    destinations: ["Finance", "Calendar"],
    dateLabel: "Friday",
    timeLabel: "Flexible",
    moneyType: "income",
    timeline: createTestTimelineResolution({
      timelineRole: "task",
      kind: "recurring",
      startDate: "2026-06-19",
      recurrence: { frequency: "weekly", days: ["Friday"] },
      label: "Friday",
    }),
    status: "active",
    createdAt,
    updatedAt: createdAt,
  };
}

{
  const items = [
    paydayItem("payday-1", "2026-06-01T00:00:00.000Z"),
    paydayItem("payday-2", "2026-06-02T00:00:00.000Z"),
  ];

  const entries = buildMemoryEntries(items, reference);
  const entryKeys = entries.map((entry) => entry.id);
  assert.equal(entries.length, 1, "duplicate payday memories should collapse to one entry");
  assert.equal(new Set(entryKeys).size, entryKeys.length, "memory list keys must be unique");

  const related = findRelatedMemories(items[0], items, reference);
  const relatedKeys = related.map((memory) => memory.id);
  assert.equal(
    new Set(relatedKeys).size,
    relatedKeys.length,
    "related memory keys must be unique",
  );
  assert.equal(related.length, 0, "duplicate memories should not appear as related");
}

{
  const { store } = capture("I get paid Friday");
  const duplicate = attemptBriefCapture(
    "I get paid Friday",
    { items: store.items, reference },
    store.handlers,
  );
  assert.equal(duplicate.status, "duplicate");
  if (duplicate.status === "duplicate") {
    assert.match(duplicate.message, /already have that one/i);
  }
  assert.equal(store.items.length, 1, "duplicate capture should not add another item");
}

console.log("format-memory-entry tests passed");
