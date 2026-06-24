import assert from "node:assert/strict";

import { buildCapturePreview } from "@/lib/mobile-prototype/build-capture-preview";
import {
  commitPreparedCapture,
} from "@/lib/mobile-prototype/capture-brief-input";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildLifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";
import { buildMemoryEntries } from "@/lib/mobile-prototype/format-memory-entry";
import { buildMyLifeOverview } from "@/lib/mobile-prototype/build-my-life";
import { previewCaptureInput } from "@/lib/mobile-prototype/preview-capture-input";
import { dedupeMemoryItems } from "@/lib/sync-capture/memory-dedup";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00");

const workSchedule = {
  days: ["SU", "MO", "TU", "WE"],
  startTime: "11:00",
  endTime: "21:00",
  recurrence: {
    frequency: "weekly" as const,
    interval: 1 as const,
    startsOn: "2026-06-01",
    endsOn: null,
  },
  status: "active" as const,
};

function pipelineContext(store: ReturnType<typeof createTestCaptureStore>) {
  return { items: store.items, reference, workSchedule };
}

function assertDiscoverable(
  store: ReturnType<typeof createTestCaptureStore>,
  titlePattern: RegExp,
  options?: { requireTimeline?: boolean },
) {
  assert.ok(store.items.length >= 1, "memory should exist in store");

  const deduped = dedupeMemoryItems(store.items, reference);
  assert.ok(
    deduped.some((item) => titlePattern.test(item.title)),
    `deduped store should contain ${titlePattern}`,
  );

  const memoryEntries = buildMemoryEntries(store.items, reference);
  assert.ok(
    memoryEntries.some((entry) => titlePattern.test(entry.title)),
    `memory list should contain ${titlePattern}`,
  );

  const brief = buildDailyBrief(pipelineContext(store));
  const myLife = buildMyLifeOverview({
    items: store.items,
    consequences: brief.consequences ?? [],
    reference,
  });
  assert.ok(myLife.rows.length >= 1, "My Life should have rows");

  if (options?.requireTimeline === false) return;

  const timeline = buildLifeTimelineView({
    consequences: brief.consequences ?? [],
    items: store.items,
    reference,
  });
  const timelineText = timeline.groups.flatMap((g) =>
    g.entries.map((e) => e.text),
  );
  assert.ok(
    timelineText.some((text) => titlePattern.test(text)),
    `timeline should show ${titlePattern}, got: ${timelineText.join(" | ")}`,
  );
}

function saveFromPreview(text: string) {
  const store = createTestCaptureStore();
  const preview = previewCaptureInput(text, pipelineContext(store));
  assert.equal(
    preview.status,
    "ready",
    `expected ready preview for "${text}", got ${preview.status}`,
  );
  if (preview.status !== "ready") return store;

  const attempt = commitPreparedCapture(
    preview.prepared,
    pipelineContext(store),
    preview.sourceMeta,
    store.handlers,
  );
  assert.equal(attempt.status, "saved", `save should succeed for "${text}"`);
  return store;
}

{
  const store = createTestCaptureStore();
  const first = previewCaptureInput(
    "sync today from 8pm to 10pm",
    pipelineContext(store),
  );
  assert.equal(first.status, "ready");
  if (first.status !== "ready") throw new Error("unreachable");

  const built = buildCapturePreview(first.prepared, reference);
  assert.match(built.title, /sync|project work/i);
  assert.match(built.areaLine, /8:00 PM/i);

  commitPreparedCapture(
    first.prepared,
    pipelineContext(store),
    first.sourceMeta,
    store.handlers,
  );

  const second = previewCaptureInput(
    "sync today from 8pm to 10pm",
    pipelineContext(store),
  );
  assert.equal(second.status, "duplicate");
  if (second.status === "duplicate") {
    assert.match(second.existing.title, /sync/i);
    assert.match(second.existing.areaLine, /8:00 PM/i);
    assert.ok(second.viewTarget, "duplicate should include navigation target");
    assert.equal(store.items.length, 1, "duplicate preview should not save yet");
  }

  assertDiscoverable(store, /sync/i);

  if (second.status === "duplicate") {
    const savedAnyway = commitPreparedCapture(
      second.prepared,
      pipelineContext(store),
      second.sourceMeta,
      store.handlers,
      { skipDuplicateCheck: true, forceNewId: true },
    );
    assert.equal(savedAnyway.status, "saved");
    assert.equal(store.items.length, 2, "save anyway should add a second memory");
  }
}

const pipelineCases = [
  { text: "workout at 8pm", pattern: /workout/i, requireTimeline: true },
  { text: "payday tomorrow at 5am", pattern: /payday/i, requireTimeline: true },
  { text: "rent due friday", pattern: /rent/i, requireTimeline: true },
  { text: "coffee this morning", pattern: /coffee/i, requireTimeline: false },
  { text: "i was sad today", pattern: /emotional|sad/i, requireTimeline: false },
];

for (const { text, pattern, requireTimeline } of pipelineCases) {
  const store = saveFromPreview(text);
  assertDiscoverable(store, pattern, { requireTimeline });
}

console.log("capture-pipeline-debug tests passed");
