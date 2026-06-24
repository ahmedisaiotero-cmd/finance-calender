import assert from "node:assert/strict";

import { buildCapturePreview } from "@/lib/mobile-prototype/build-capture-preview";
import {
  buildPaydayBeforeRentContext,
  buildEmotionalContext,
} from "@/lib/mobile-prototype/build-life-context";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildHomePriorities } from "@/lib/mobile-prototype/build-home-priorities";
import { previewCaptureInput } from "@/lib/mobile-prototype/preview-capture-input";
import {
  formatShowsInDestinations,
  CONTEXT_PAYDAY_BEFORE_RENT,
} from "@/lib/mobile-prototype/sync-voice";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const BANNED = [
  /tomorrow is tomorrow/i,
  /coffee is today/i,
  /new task is tomorrow/i,
  /a few moments sync is holding/i,
  /productivity/i,
  /ai assistant/i,
  /crush your goals/i,
  /great job/i,
];

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

function assertNoBannedCopy(text: string) {
  for (const pattern of BANNED) {
    assert.ok(!pattern.test(text), `banned copy found: ${text}`);
  }
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

assert.equal(
  formatShowsInDestinations(["Work", "Life Timeline"]),
  "Shows in Work and Life Timeline.",
);
assert.equal(formatShowsInDestinations(["Personal"]), "Shows in Personal.");

{
  const reference = new Date("2026-06-10T12:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  captureFromBriefInput("payday thursday at 5am", ctx, store.handlers);
  captureFromBriefInput("rent due friday", ctx, store.handlers);

  const brief = buildDailyBrief({ items: store.items, reference, workSchedule });
  const connection = buildPaydayBeforeRentContext(
    brief.consequences ?? [],
    store.items,
    reference,
  );
  assert.ok(
    connection,
    `expected payday/rent connection; money items: ${store.items.map((i) => i.title).join(", ")}`,
  );
  assert.equal(connection?.text, CONTEXT_PAYDAY_BEFORE_RENT);

  const view = homeAt(reference, store.items);
  const allText = [view.headline.text, ...view.details.map((l) => l.text), view.forecast?.text ?? ""].join(" ");
  assert.ok(
    /payday lands before rent is due|money lands before rent is due/i.test(allText) ||
      (/payday/i.test(allText) && /rent/i.test(allText)),
  );
  assertNoBannedCopy(allText);
}

{
  const reference = new Date("2026-06-14T21:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("i worked today on sync from 8pm to 10pm", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.match(view.headline.text, /sync work wraps at 10:00 PM/i);
  assertNoBannedCopy(view.headline.text);
}

{
  const reference = new Date("2026-06-14T19:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("workout at 8pm", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.match(view.headline.text, /workout starts at 8:00 PM/i);
}

{
  const reference = new Date("2026-06-14T22:30:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("i have a flight tomorrow at 6am", ctx, store.handlers);

  const view = homeAt(reference, store.items);
  assert.match(view.headline.text, /tomorrow starts early|tight morning|flight/i);
  assertNoBannedCopy([view.headline.text, ...view.details.map((l) => l.text)].join(" "));
}

{
  const reference = new Date("2026-06-14T18:00:00");
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };
  captureFromBriefInput("i was sad today", ctx, store.handlers);
  captureFromBriefInput("i feel stressed again", ctx, store.handlers);

  const emotion = buildEmotionalContext(store.items, reference);
  assert.ok(emotion);
  assert.match(emotion?.text ?? "", /stress|emotional/i);
  assertNoBannedCopy(emotion?.text ?? "");
}

{
  const reference = new Date("2026-06-14T18:00:00");
  const store = createTestCaptureStore();
  const preview = previewCaptureInput("coffee this morning", {
    items: store.items,
    reference,
    workSchedule,
  });
  assert.equal(preview.status, "ready");
  if (preview.status === "ready") {
    const built = buildCapturePreview(preview.prepared, reference);
    assert.match(built.detail, /quietly/i);
    assert.match(built.detail, /shows in|sync will keep/i);
  }
}

{
  const reference = new Date("2026-06-14T18:00:00");
  const store = createTestCaptureStore();
  const preview = previewCaptureInput("i worked today on a project from 8pm to 10pm", {
    items: store.items,
    reference,
    workSchedule,
  });
  assert.equal(preview.status, "ready");
  if (preview.status === "ready") {
    const built = buildCapturePreview(preview.prepared, reference);
    assert.ok(built.title.length > 0);
    assert.match(built.areaLine, /work/i);
    assert.match(built.detail, /shows in work/i);
  }
}

console.log("sync-voice-context tests passed");
