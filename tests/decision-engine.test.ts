import assert from "node:assert/strict";

import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import {
  decideTodayPriorities,
  isTomorrowSummaryText,
} from "@/lib/intelligence/decision-engine";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { buildSyncTimeBlocksForRange } from "@/lib/sync-time-blocks";
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

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function decisionAt(
  reference: Date,
  items: ReturnType<typeof createTestCaptureStore>["items"],
  options: { maxSupporting?: number; priorities?: string[] } = {},
) {
  const brief = buildDailyBrief({ items, reference, workSchedule });
  const blocks = buildSyncTimeBlocksForRange({
    items,
    startDate: reference,
    endDate: addDays(reference, 14),
    reference,
    workSchedule,
  });

  return decideTodayPriorities({
    consequences: brief.consequences ?? [],
    items,
    blocks,
    reference,
    workSchedule,
    hasUserContext: items.length > 0,
    maxSupporting: options.maxSupporting,
    priorities: options.priorities,
  });
}

// Profile priorities lift matching consequences when their urgency is otherwise equal.
{
  const reference = new Date("2026-06-14T18:00:00");
  const decision = decideTodayPriorities({
    consequences: [
      {
        id: "payday",
        sourceMemoryId: null,
        kind: "income",
        surfaceText: "Payday is tomorrow.",
        daysUntil: 1,
        dateKey: "2026-06-15",
        priority: 10,
        horizon: "coming_soon",
        area: "finance",
        briefEligible: true,
      },
      {
        id: "school",
        sourceMemoryId: null,
        kind: "family_moment",
        surfaceText: "Take daughter to school tomorrow.",
        daysUntil: 1,
        dateKey: "2026-06-15",
        priority: 10,
        horizon: "coming_soon",
        area: "family",
        briefEligible: true,
      },
    ],
    items: [],
    blocks: [],
    reference,
    hasUserContext: true,
    priorities: ["Family"],
  });

  assert.match(decision.primary.text, /daughter.*school/i);
}

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

function allDecisionText(decision: ReturnType<typeof decideTodayPriorities>) {
  return [
    decision.primary.text,
    ...decision.supporting.map((candidate) => candidate.text),
  ].join(" ");
}

// Sync ongoing at 9:30 PM — primary is sync wrap, not tomorrow summary
{
  const reference = new Date("2026-06-14T21:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("sync today from 8pm to 10pm", ctx, store.handlers);
  captureFromBriefInput("payday tomorrow at 5am", ctx, store.handlers);
  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const decision = decisionAt(reference, store.items);

  assert.match(decision.primary.text, /sync work wraps at 10:00 PM/i);
  assert.ok(!isTomorrowSummaryText(decision.primary.text));
  assert.ok(decision.supporting.some((line) => /payday/i.test(line.text)));
  assert.ok(decision.supporting.some((line) => /flight/i.test(line.text)));
}

// Same inputs at 10:30 PM — primary is next specific item, not tomorrow summary
{
  const reference = new Date("2026-06-14T22:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("sync today from 8pm to 10pm", ctx, store.handlers);
  captureFromBriefInput("payday tomorrow at 5am", ctx, store.handlers);
  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const decision = decisionAt(reference, store.items);

  assert.ok(!isTomorrowSummaryText(decision.primary.text));
  assert.ok(
    /payday|flight/i.test(decision.primary.text),
    `expected payday or flight primary, got: ${decision.primary.text}`,
  );
}

// Workout at 7:30 PM
{
  const reference = new Date("2026-06-14T19:30:00");
  const store = seedScenario(reference);
  const decision = decisionAt(reference, store.items);

  assert.match(decision.primary.text, /workout starts at 8:00 PM/i);
  assert.ok(decision.supporting.some((line) => /payday/i.test(line.text)));
  assert.ok(decision.supporting.some((line) => /flight/i.test(line.text)));
}

// Light items do not dominate when nothing important exists
{
  const reference = new Date("2026-06-14T18:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("coffee this morning", ctx, store.handlers);
  captureFromBriefInput("spent 9 dollars at mcdonalds earlier", ctx, store.handlers);
  captureFromBriefInput("i was sad today", ctx, store.handlers);

  const decision = decisionAt(reference, store.items);
  const priorityText = allDecisionText(decision);

  assert.ok(!/coffee|mcdonald/i.test(priorityText), "light items should not lead Today");
}

// Empty state when no user context
{
  const reference = new Date("2026-06-14T20:00:00");
  const decision = decideTodayPriorities({
    consequences: [],
    items: [],
    blocks: [],
    reference,
    hasUserContext: false,
  });

  assert.equal(decision.isEmpty, true);
  assert.equal(decision.primary.text, "");
  assert.equal(decision.supporting.length, 0);
}

// Many consequences — only the top 1–3 surface
{
  const reference = new Date("2026-06-10T12:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  const prompts = [
    "payday thursday at 5am",
    "rent due friday",
    "i have a flight tomorrow at 6am",
    "dentist appointment next monday",
    "team sync tomorrow at 2pm",
    "submit taxes by april 15",
    "mom birthday next week",
    "car insurance renews next month",
    "gym class tomorrow at 7am",
    "project deadline friday",
  ];

  for (const text of prompts) {
    captureFromBriefInput(text, ctx, store.handlers);
  }

  const decision = decisionAt(reference, store.items);
  const surfaced = 1 + decision.supporting.length;

  assert.ok(surfaced <= 3, `expected at most 3 surfaced priorities, got ${surfaced}`);
  assert.ok(decision.primary.text.length > 0, "primary should still be chosen");
  assert.ok(
    decision.supporting.length <= 2,
    `supporting should respect maxSupporting=2, got ${decision.supporting.length}`,
  );
}

console.log("decision-engine tests passed");
