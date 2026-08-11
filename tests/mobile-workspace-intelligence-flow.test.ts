import assert from "node:assert/strict";

import { attemptBriefCapture } from "@/lib/mobile-prototype/capture-brief-input";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildUnderstandingView } from "@/lib/mobile-prototype/build-understanding-view";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00");

function captureWithFallback(
  text: string,
  fallback: string,
  store: ReturnType<typeof createTestCaptureStore>,
) {
  const first = attemptBriefCapture(
    text,
    { items: store.items, reference },
    store.handlers,
  );

  if (first.status === "saved") return first;

  const second = attemptBriefCapture(
    fallback,
    { items: store.items, reference },
    store.handlers,
  );
  return second;
}

{
  const store = createTestCaptureStore();

  const attempts = [
    captureWithFallback(
      "I skipped the gym because work drained me.",
      "I skipped the gym because work drained me today.",
      store,
    ),
    captureWithFallback(
      "Payday hits Friday but rent is due Monday.",
      "Payday hits Friday but rent is due Monday.",
      store,
    ),
    captureWithFallback(
      "My mom's birthday is tomorrow.",
      "My mom's birthday is tomorrow.",
      store,
    ),
    captureWithFallback(
      "I worked on Sync from 8 to 10 tonight.",
      "I worked on Sync from 8pm to 10pm tonight.",
      store,
    ),
    captureWithFallback(
      "I think I'm spending too much on subscriptions.",
      "I think I'm spending too much on subscriptions this month.",
      store,
    ),
  ];

  assert.ok(
    attempts.some((attempt) => attempt.status === "saved"),
    "at least one messy capture should save directly",
  );
  assert.ok(store.items.length >= 4, "messy captures should create memory items");

  const brief = buildDailyBrief({
    items: store.items,
    reference,
    workSchedule: null,
  });

  const briefText = [
    brief.lede,
    ...brief.sections.flatMap((section) => section.paragraphs),
  ].join(" ");

  assert.match(
    briefText,
    /mom|birthday|rent|payday|sync|work/i,
    "briefing should reflect captured life context",
  );

  const understanding = buildUnderstandingView({
    items: store.items,
    consequences: brief.consequences ?? [],
    reference,
  });

  assert.equal(understanding.isEmpty, false, "understanding should not be empty after capture");
  assert.ok(
    understanding.rows.some((row) => row.label === "Money"),
    "money understanding should appear",
  );
  assert.ok(
    understanding.rows.some((row) => row.label === "Work"),
    "work understanding should appear",
  );
  assert.ok(
    understanding.rows.some((row) => row.label === "Health"),
    "health understanding should appear",
  );
  assert.ok(
    understanding.rows.some((row) => row.label === "Family"),
    "family understanding should appear",
  );

  const moneySummary =
    understanding.rows.find((row) => row.label === "Money")?.summary ?? "";
  assert.match(
    moneySummary,
    /rent|payday|money|subscription|spending/i,
    "money summary should reflect financial pressure context",
  );
}

console.log("mobile-workspace-intelligence-flow tests passed");
