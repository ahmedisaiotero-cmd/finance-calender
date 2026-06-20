import assert from "node:assert/strict";

import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import {
  buildAllConsequences,
  buildConsequenceBrief,
  deriveConsequencesFromMemory,
} from "@/lib/intelligence/sync-consequences";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
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

{
  const store = createTestCaptureStore();
  const captured = captureFromBriefInput(
    "My friend's birthday is tomorrow",
    { items: store.items, reference },
    store.handlers,
  );
  assert.ok(captured, "friend birthday should capture");

  const item = store.items[0];
  assert.ok(item, "friend birthday item should exist");

  const consequences = deriveConsequencesFromMemory(item, reference);
  assert.ok(
    consequences.some((c) => /friend's birthday is tomorrow/i.test(c.surfaceText)),
    `expected birthday consequence, got: ${consequences.map((c) => c.surfaceText).join("; ")}`,
  );

  const brief = buildDailyBrief({
    items: [item],
    workSchedule,
    reference,
  });

  assert.match(
    brief.lede,
    /Your friend's birthday is tomorrow/i,
    `brief should surface birthday consequence immediately, got: ${brief.lede}`,
  );
  assert.doesNotMatch(brief.lede, /Work starts at/i);
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput("I don't work tomorrow", {
    items: store.items,
    reference,
    workSchedule,
  }, store.handlers);

  const brief = buildConsequenceBrief({
    items: store.items,
    workSchedule,
    reference,
  });

  assert.match(brief.lede, /You're off tomorrow/i);
  assert.ok(brief.consequences.length >= 1);
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput("Rent is due Friday", { items: store.items, reference }, store.handlers);

  const consequences = buildAllConsequences({
    items: store.items,
    reference,
    workSchedule: null,
  });

  assert.ok(
    consequences.some((c) => c.kind === "financial_due"),
    "rent should create a financial due consequence",
  );
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput(
    "My friend's birthday is tomorrow",
    { items: store.items, reference },
    store.handlers,
  );
  captureFromBriefInput(
    "Payday is next Wednesday",
    { items: store.items, reference },
    store.handlers,
  );

  const brief = buildDailyBrief({
    items: store.items,
    workSchedule,
    reference,
  });

  assert.match(brief.lede, /friend's birthday is tomorrow/i);
  assert.doesNotMatch(brief.lede, /payday/i);
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput("Rent is due tomorrow", {
    items: store.items,
    reference,
  }, store.handlers);
  captureFromBriefInput("Payday is next Wednesday", {
    items: store.items,
    reference,
  }, store.handlers);

  const brief = buildDailyBrief({
    items: store.items,
    workSchedule: null,
    reference,
  });

  assert.match(brief.lede, /rent is due tomorrow/i);
  assert.doesNotMatch(brief.lede, /payday/i);
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput("I don't work tomorrow", {
    items: store.items,
    reference,
    workSchedule,
  }, store.handlers);
  captureFromBriefInput("My friend's birthday is tomorrow", {
    items: store.items,
    reference,
    workSchedule,
  }, store.handlers);

  const brief = buildDailyBrief({
    items: store.items,
    workSchedule,
    reference,
  });

  assert.match(brief.lede, /friend's birthday is tomorrow/i);
  assert.doesNotMatch(brief.lede, /off tomorrow/i);
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput("Rent is due Friday", {
    items: store.items,
    reference,
    workSchedule,
  }, store.handlers);
  captureFromBriefInput("Payday lands Wednesday", {
    items: store.items,
    reference,
    workSchedule,
  }, store.handlers);
  captureFromBriefInput("My anniversary is Friday", {
    items: store.items,
    reference,
    workSchedule,
  }, store.handlers);

  const brief = buildConsequenceBrief({
    items: store.items,
    workSchedule,
    reference,
  });

  const comingSoon = brief.sections.find((section) => section.id === "noticing");
  assert.ok(comingSoon, "expected coming soon section");
  assert.ok(comingSoon.paragraphs.length >= 2, "coming soon should use separate lines");
  assert.ok(
    comingSoon.paragraphs.every((line) => !line.includes(". ") || line.split(". ").length === 1),
    "each coming soon entry should be one line, not a joined paragraph",
  );
  assert.ok(
    comingSoon.paragraphs.some((line) => /payday/i.test(line)),
    "payday should appear in coming soon",
  );
  assert.ok(
    !comingSoon.paragraphs.some((line) => /\d{1,2}:\d{2}\s*work/i.test(line)),
    "routine work schedule lines should not appear in coming soon",
  );
}

console.log("sync-consequences tests passed");
