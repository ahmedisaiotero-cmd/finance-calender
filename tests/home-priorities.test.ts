import assert from "node:assert/strict";

import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import {
  buildHomePriorities,
  isTomorrowSummaryText,
} from "@/lib/mobile-prototype/build-home-priorities";
import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

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

const BANNED_VISIBLE = [
  /next priority/i,
  /forecast/i,
  /tomorrow is tomorrow/i,
  /coffee is today/i,
  /new task is tomorrow/i,
];

function seedScenario(reference: Date) {
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  for (const text of [
    "workout at 8pm",
    "payday tomorrow at 5am",
    "i have a flight tomorrow at 6am",
  ]) {
    captureFromBriefInput(text, ctx, store.handlers);
  }

  return store;
}

function homeAt(reference: Date, items: ReturnType<typeof createTestCaptureStore>["items"]) {
  const brief = buildDailyBrief({ items, reference, workSchedule });
  return buildHomePriorities({
    consequences: brief.consequences ?? [],
    items,
    reference,
    workSchedule,
    hasUserContext: items.length > 0,
  });
}

function allHomeText(view: ReturnType<typeof homeAt>) {
  return [
    view.primaryPriority.text,
    ...view.supportingPriorities.map((line) => line.text),
    view.futureContext?.text ?? "",
  ].join(" ");
}

function assertNoDuplicatePaydayRent(view: ReturnType<typeof homeAt>) {
  const paydayRent = /payday lands before rent|money lands before rent/i;
  const matches = allHomeText(view).match(new RegExp(paydayRent.source, "gi")) ?? [];
  assert.ok(matches.length <= 1, "payday/rent phrasing should not duplicate");
}

function assertNoBannedVisible(view: ReturnType<typeof homeAt>) {
  const rendered = allHomeText(view);
  for (const pattern of BANNED_VISIBLE) {
    assert.ok(!pattern.test(rendered), `banned visible copy: ${rendered}`);
  }
  assert.equal(view.sectionLabel, null);
  assert.equal(view.forecastLabel, null);
}

function assertSyncEngineMetadata(view: ReturnType<typeof homeAt>) {
  assert.equal(view.syncEngine.primary.text, view.primaryPriority.text);
  assert.deepEqual(
    view.syncEngine.supporting.map((line) => line.text),
    view.supportingPriorities.map((line) => line.text),
  );
  assert.equal(view.syncEngine.quality.preservesVisibleCopy, true);
  assert.equal(view.syncEngine.quality.preservesDecisionOrdering, true);
  assert.ok(view.syncEngine.continuity);
  assert.equal(view.syncEngine.continuity.window.days, 7);

  const selectedLines = [
    view.syncEngine.primary,
    ...view.syncEngine.supporting,
  ];

  for (const line of selectedLines) {
    assert.ok(line.intent, `missing intent for ${line.text}`);
    assert.ok(line.confidence, `missing confidence for ${line.text}`);
    assert.ok(line.reasons.length > 0, `missing reasons for ${line.text}`);
    assert.ok(line.evidence.length > 0, `missing evidence for ${line.text}`);
    assert.ok(line.explanation.isExplainable, `missing explanation for ${line.text}`);
    assert.ok(line.explanation.headline, `missing explanation headline for ${line.text}`);
    assert.equal(line.quality.hasIntent, true);
    assert.equal(line.quality.hasConfidence, true);
    assert.equal(line.quality.hasReason, true);
    assert.equal(line.quality.hasEvidence, true);
  }
}

// Test 1: sync ongoing at 9:30 PM — primary is sync wrap, not tomorrow summary
{
  const reference = new Date("2026-06-14T21:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("sync today from 8pm to 10pm", ctx, store.handlers);
  captureFromBriefInput("payday tomorrow at 5am", ctx, store.handlers);
  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const view = homeAt(reference, store.items);

  assert.match(view.primaryPriority.text, /sync work wraps at 10:00 PM/i);
  assert.ok(!isTomorrowSummaryText(view.primaryPriority.text));
  assert.ok(view.supportingPriorities.some((line) => /payday/i.test(line.text)));
  assert.ok(view.supportingPriorities.some((line) => /flight/i.test(line.text)));
  assertNoBannedVisible(view);
  assertSyncEngineMetadata(view);
}

// Test 2: same inputs at 10:30 PM — primary is next specific item, not tomorrow summary
{
  const reference = new Date("2026-06-14T22:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("sync today from 8pm to 10pm", ctx, store.handlers);
  captureFromBriefInput("payday tomorrow at 5am", ctx, store.handlers);
  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const view = homeAt(reference, store.items);

  assert.ok(!isTomorrowSummaryText(view.primaryPriority.text));
  assert.ok(
    /payday|flight/i.test(view.primaryPriority.text),
    `expected payday or flight primary, got: ${view.primaryPriority.text}`,
  );
  assertNoBannedVisible(view);
  assertSyncEngineMetadata(view);
}

// Test 3: workout at 7:30 PM
{
  const reference = new Date("2026-06-14T19:30:00");
  const store = seedScenario(reference);
  const view = homeAt(reference, store.items);

  assert.match(view.primaryPriority.text, /workout starts at 8:00 PM/i);
  assert.ok(view.supportingPriorities.some((line) => /payday/i.test(line.text)));
  assert.ok(view.supportingPriorities.some((line) => /flight/i.test(line.text)));
  assertNoBannedVisible(view);
  assertSyncEngineMetadata(view);
}

// Test 4: payday + rent — connection appears once, not duplicated
{
  const reference = new Date("2026-06-10T12:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("payday thursday at 5am", ctx, store.handlers);
  captureFromBriefInput("rent due friday", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  const allText = allHomeText(view);
  assert.ok(
    /payday lands before rent is due|money lands before rent is due/i.test(allText) ||
      (/payday/i.test(allText) && /rent/i.test(allText)),
  );
  assertNoDuplicatePaydayRent(view);
  assertNoBannedVisible(view);
  assertSyncEngineMetadata(view);
}

// Test 5: light items do not dominate when nothing important exists
{
  const reference = new Date("2026-06-14T18:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("coffee this morning", ctx, store.handlers);
  captureFromBriefInput("spent 9 dollars at mcdonalds earlier", ctx, store.handlers);
  captureFromBriefInput("i was sad today", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  const priorityText = [
    view.primaryPriority.text,
    ...view.supportingPriorities.map((line) => line.text),
  ].join(" ");

  assert.ok(!/coffee|mcdonald/i.test(priorityText), "light items should not lead Home");
  assertNoBannedVisible(view);
  assertSyncEngineMetadata(view);
}

// Test 6: quiet state when no meaningful upcoming data
{
  const reference = new Date("2026-06-14T20:00:00");
  const view = buildTodayView({
    brief: {
      userName: null,
      lede: "Quiet for now — nothing pressing.",
      sections: [],
      isEmpty: true,
      consequences: [],
    },
    consequences: [],
    items: [],
    reference,
  });

  assert.match(view.primaryPriority.text, /tell sync|on your mind/i);
  assert.equal(view.sectionLabel, null);
  assert.equal(view.forecastLabel, null);
  assert.equal(view.syncEngine.primary.text, view.primaryPriority.text);
  assert.equal(view.syncEngine.isEmpty, true);
  assert.deepEqual(view.syncEngine.supporting, []);
  assert.deepEqual(view.syncEngine.rankedLines, []);
  assertSyncEngineMetadata(view);
}

// Scenario D: flight + work tomorrow late evening — specific items lead
{
  const reference = new Date("2026-06-14T22:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.match(view.primaryPriority.text, /flight/i);
  assert.ok(
    view.supportingPriorities.some((line) => /work (starts|begins) at 11:00 AM/i.test(line.text)) ||
      view.futureContext?.text.match(/tomorrow starts early|tight morning/i),
  );
  assertNoBannedVisible(view);
  assertSyncEngineMetadata(view);
}

console.log("home-priorities tests passed");
