import assert from "node:assert/strict";

import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { buildCaptureConfirmation } from "@/lib/mobile-prototype/build-capture-confirmation";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildLifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";
import { buildMyLifeOverview } from "@/lib/mobile-prototype/build-my-life";
import {
  attemptBriefCapture,
  captureFromBriefInput,
} from "@/lib/mobile-prototype/capture-brief-input";
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

function capture(text: string, store = createTestCaptureStore()) {
  const attempt = attemptBriefCapture(
    text,
    { items: store.items, reference, workSchedule },
    store.handlers,
  );
  assert.equal(attempt.status, "saved", `expected save for: ${text} got ${attempt.status}`);
  assert.ok(store.items.length > 0, `expected item in store for: ${text}`);
  return { store, item: store.items[0]!, attempt };
}

{
  const { item, store } = capture("i worked today on a project from 8pm to 10pm");
  assert.equal(buildMemoryProfile(item, reference).area, "Work");
  assert.match(item.title, /project work/i);

  const brief = buildDailyBrief({ items: store.items, reference, workSchedule });
  const consequences = brief.consequences ?? [];

  const confirmation = buildCaptureConfirmation(item, { reference, consequences });
  assert.equal(confirmation.headline, "Remembered.");
  assert.match(confirmation.line, /Work · Today, 8:00 PM–10:00 PM/i);

  const timeline = buildLifeTimelineView({
    consequences,
    items: store.items,
    reference,
  });
  const today = timeline.groups.find((group) => group.label === "Today");
  assert.ok(today?.entries.some((entry) => /project work/i.test(entry.text)));
  assert.ok(today?.entries.some((entry) => /8:00 PM–10:00 PM/.test(entry.time ?? "")));

  const myLife = buildMyLifeOverview({
    items: store.items,
    consequences,
    reference,
  });
  assert.ok(myLife.rows.some((row) => row.label === "Work"));
}

{
  const inputs = [
    "worked on sync from 7 to 9",
    "i coded tonight 8-10",
    "workout at 8pm",
    "i was sad today",
    "spent 9 dollars at mcdonalds",
    "mom birthday tomorrow",
    "my daughter has school tomorrow",
    "rent due friday",
    "payday tomorrow at 5am",
    "coffee this morning",
    "fixed my car today",
    "i cleaned my room",
  ];

  for (const text of inputs) {
    const store = createTestCaptureStore();
    const result = captureFromBriefInput(
      text,
      { items: store.items, reference, workSchedule },
      store.handlers,
    );
    assert.ok(result, `expected saved memory for: ${text}`);
    const confirmation = buildCaptureConfirmation(store.items[0]!, {
      reference,
      consequences:
        buildDailyBrief({ items: store.items, reference, workSchedule })
          .consequences ?? [],
    });
    assert.equal(confirmation.headline, "Remembered.");
  }
}

{
  const store = createTestCaptureStore();
  capture("i was sad today", store);
  capture("my friend's birthday is tomorrow", store);

  const brief = buildDailyBrief({ items: store.items, reference, workSchedule });
  const myLife = buildMyLifeOverview({
    items: store.items,
    consequences: brief.consequences ?? [],
    reference,
  });

  const health = myLife.rows.find((row) => row.label === "Health");
  assert.ok(health);
  assert.ok(!/family and relationship/i.test(health!.summary));
}

console.log("universal-capture tests passed");
