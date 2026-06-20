import assert from "node:assert/strict";

import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import {
  attemptBriefCapture,
  captureFromBriefInput,
} from "@/lib/mobile-prototype/capture-brief-input";
import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
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

function capture(
  text: string,
  options?: {
    existing?: ReturnType<typeof createTestCaptureStore>["items"];
    workSchedule?: typeof workSchedule | null;
  },
) {
  const store = createTestCaptureStore(options?.existing ?? []);
  const result = captureFromBriefInput(
    text,
    {
      items: store.items,
      reference,
      workSchedule: options?.workSchedule ?? null,
    },
    store.handlers,
  );
  assert.ok(result, `expected capture to succeed for: ${text}`);
  return { result: result!, item: store.items[0], store };
}

const examples = [
  "I get paid Friday",
  "Mom's birthday is June 22",
  "I worked overtime today",
  "I went to the gym",
  "Rent is due next Friday",
] as const;

for (const text of examples) {
  capture(text);
}

{
  const { result: payday, item } = capture("I get paid Friday");
  const brief = buildDailyBrief({
    items: [item],
    reference,
    workSchedule: null,
  });

  assert.match(brief.lede, /Payday is in 5 days|Quiet for now/i);
  const comingSoon = brief.sections.find((section) => section.id === "noticing");
  if (!/Payday is in 5 days/i.test(brief.lede)) {
    assert.match(comingSoon?.paragraphs[0] ?? "", /Payday lands Friday/i);
  }
  assert.equal(payday.title, "Payday");
}

{
  const { item } = capture("Rent is due next Friday");
  const brief = buildDailyBrief({
    items: [item],
    reference,
    workSchedule: null,
  });

  assert.doesNotMatch(brief.lede, /Rent/i);
  const body = [brief.lede, ...brief.sections.flatMap((section) => section.paragraphs)].join(" ");
  assert.doesNotMatch(body, /Rent is due in 12 days/i);
}

{
  const store = createTestCaptureStore();
  const vague = attemptBriefCapture("what's up", { items: [], reference }, store.handlers);
  assert.equal(vague.status, "too_vague");
  if (vague.status === "too_vague") {
    assert.match(vague.message, /Say what happened, or what's coming/i);
  }
}

{
  const { item } = capture("I get paid every other Thursday");
  const nextKey = resolveCaptureDateKey(item, reference);
  assert.ok(nextKey);
  const brief = buildDailyBrief({ items: [item], reference, workSchedule: null });
  const body = [brief.lede, ...brief.sections.flatMap((section) => section.paragraphs)].join(" ");
  assert.match(body, /Payday/i);
  if (!/Payday is (today|tomorrow)/i.test(brief.lede)) {
    assert.doesNotMatch(brief.lede, /Payday is in \d+ days/i);
  }
}

{
  const { result, item } = capture("My girlfriend's birthday is April 25");
  assert.match(result.title, /Girlfriend's Birthday/i);
  assert.ok(item.destinations.includes("Relationships"));
  assert.equal(item.timeline?.recurrence?.frequency, "yearly");

  const brief = buildDailyBrief({ items: [item], reference, workSchedule: null });
  const body = [brief.lede, ...brief.sections.flatMap((s) => s.paragraphs)].join(" ");
  assert.doesNotMatch(body, /Girlfriend's Birthday|April 25/i);
}

{
  const { result, item } = capture("I don't work tomorrow", { workSchedule });
  assert.match(result.title, /Day Off Tomorrow/i);
  assert.equal(item.workAvailability, "off");

  const brief = buildDailyBrief({ items: [item], reference, workSchedule });
  assert.match(brief.lede, /You're off tomorrow/i);
  assert.doesNotMatch(brief.lede, /Work starts at/i);
}

{
  const { item } = capture("Rent is due Friday");
  const brief = buildDailyBrief({ items: [item], reference, workSchedule: null });
  const comingSoon =
    brief.sections.find((section) => section.id === "noticing")?.paragraphs[0] ?? "";
  assert.match(comingSoon, /Rent is due Friday/i);
}

{
  const { store } = capture("my mom's birthday is december 14");
  const deleteAttempt = attemptBriefCapture(
    "delete mom's birthday",
    { items: store.items, reference },
    store.handlers,
  );
  assert.equal(deleteAttempt.status, "saved");
  if (deleteAttempt.status === "saved") {
    assert.equal(deleteAttempt.kind, "delete");
    assert.match(deleteAttempt.result.title, /Mom's Birthday/i);
  }
  assert.equal(
    store.items[0]?.deletedAt != null || store.items[0]?.status === "cancelled",
    true,
  );
}

console.log("capture-brief-input tests passed");
