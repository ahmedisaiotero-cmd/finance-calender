import assert from "node:assert/strict";

import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildHomePriorities } from "@/lib/mobile-prototype/build-home-priorities";
import {
  REFLECTION_EMOTIONAL_TODAY,
  REFLECTION_HEALTH_TODAY,
  REFLECTION_ONGOING_WORK,
  REFLECTION_QUIET_TODAY,
  REFLECTION_SPENT_SYNC_WORK,
} from "@/lib/mobile-prototype/sync-voice";
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

const BANNED = [
  /reflection/i,
  /next priority/i,
  /forecast/i,
  /tomorrow is tomorrow/i,
  /coffee is today/i,
  /new task/i,
  /\bhavbe\b/i,
  /\bscvhool\b/i,
];

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

function allRendered(view: ReturnType<typeof homeAt>) {
  return [
    view.reflection?.text ?? "",
    view.primaryPriority.text,
    ...view.supportingPriorities.map((line) => line.text),
    view.futureContext?.text ?? "",
  ].join(" ");
}

function assertNoBanned(text: string) {
  for (const pattern of BANNED) {
    assert.ok(!pattern.test(text), `banned copy: ${text}`);
  }
}

// Test 1: ongoing sync block at 9:30 PM
{
  const reference = new Date("2026-06-14T21:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("sync today from 8pm to 10pm", ctx, store.handlers);
  captureFromBriefInput("payday tomorrow at 5am", ctx, store.handlers);
  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.equal(view.reflection?.text, REFLECTION_ONGOING_WORK);
  assert.match(view.primaryPriority.text, /sync work wraps at 10:00 PM/i);
  assertNoBanned(allRendered(view));
}

// Test 2: completed sync at 10:30 PM
{
  const reference = new Date("2026-06-14T22:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("sync today from 8pm to 10pm", ctx, store.handlers);
  captureFromBriefInput("payday tomorrow at 5am", ctx, store.handlers);
  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.equal(view.reflection?.text, REFLECTION_SPENT_SYNC_WORK);
  assert.ok(/payday|flight/i.test(view.primaryPriority.text));
  assertNoBanned(allRendered(view));
}

// Test 3: emotional note today
{
  const reference = new Date("2026-06-14T18:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("i was sad today", ctx, store.handlers);
  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.equal(view.reflection?.text, REFLECTION_EMOTIONAL_TODAY);
  assert.match(view.primaryPriority.text, /flight/i);
  assertNoBanned(allRendered(view));
}

// Test 4: completed workout after 8pm
{
  const reference = new Date("2026-06-14T21:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("workout at 8pm", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.equal(view.reflection?.text, REFLECTION_HEALTH_TODAY);
  assertNoBanned(allRendered(view));
}

// Test 5: light items only — quiet reflection, not overdramatic
{
  const reference = new Date("2026-06-14T18:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("coffee this morning", ctx, store.handlers);
  captureFromBriefInput("spent 9 dollars at mcdonalds earlier", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.ok(
    view.reflection?.text === REFLECTION_QUIET_TODAY || view.reflection == null,
  );
  assert.ok(!/money showed up|full|emotional/i.test(view.reflection?.text ?? ""));
  assertNoBanned(allRendered(view));
}

// Test 6: tomorrow school — no typo copy on Home
{
  const reference = new Date("2026-06-14T18:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("i havbe to take duaghter to svchool tomorrow", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  const rendered = allRendered(view);
  assert.match(rendered, /take daughter to school tomorrow/i);
  assert.ok(!/\bhavbe\b|\bscvhool\b/i.test(rendered));
  assertNoBanned(rendered);
}

console.log("home-reflection tests passed");
