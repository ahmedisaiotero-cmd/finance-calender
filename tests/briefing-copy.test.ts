import assert from "node:assert/strict";

import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import {
  buildHomePriorities,
  isTomorrowSummaryText,
} from "@/lib/mobile-prototype/build-home-priorities";
import { buildMyLifeOverview } from "@/lib/mobile-prototype/build-my-life";
import { buildLifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";
import { memoryFilterCategory } from "@/lib/mobile-prototype/memory-category";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import {
  cleanSurfacedCopy,
  isAwkwardSurfacedLine,
} from "@/lib/sync-capture/surface-copy";
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

const reference = new Date("2026-06-14T18:00:00");

function capture(text: string) {
  const store = createTestCaptureStore();
  captureFromBriefInput(text, { items: store.items, reference, workSchedule }, store.handlers);
  return store.items[store.items.length - 1];
}

function assertCleanCopy(text: string) {
  assert.ok(!isAwkwardSurfacedLine(text), `awkward surfaced copy: ${text}`);
  assert.ok(!/\bis tomorrow\b/i.test(text) || !/\btomorrow\b.*\bis tomorrow\b/i.test(text));
  assert.ok(!/\bhavbe\b|\bduaghter\b|\bsvchool\b|\bscvhool\b/i.test(text));
}

{
  const item = capture("i havbe to take duaghter to svchool tomorrow");
  assert.match(displayMemoryTitle(item), /take daughter to school/i);
  assert.equal(memoryFilterCategory(item), "Family");

  const brief = buildDailyBrief({ items: [item], reference, workSchedule });
  const home = buildHomePriorities({
    consequences: brief.consequences ?? [],
    items: [item],
    reference,
    workSchedule,
    hasUserContext: true,
  });
  const timeline = buildLifeTimelineView({
    consequences: brief.consequences ?? [],
    items: [item],
    reference,
  });
  const myLife = buildMyLifeOverview({
    items: [item],
    consequences: brief.consequences ?? [],
    reference,
  });

  assertCleanCopy(home.primaryPriority.text);
  assert.match(home.primaryPriority.text, /take daughter to school tomorrow/i);
  assert.ok(!/is tomorrow\.?$/i.test(home.primaryPriority.text.replace(/tomorrow\./i, "")));

  for (const entry of timeline.groups.flatMap((group) => group.entries)) {
    assertCleanCopy(entry.text);
  }

  for (const row of myLife.rows) {
    assertCleanCopy(row.summary);
  }
}

{
  const item = capture("5 dollars");
  assert.equal(memoryFilterCategory(item), "Money");
  assert.match(displayMemoryTitle(item), /small money note/i);

  const brief = buildDailyBrief({ items: [item], reference, workSchedule });
  const myLife = buildMyLifeOverview({
    items: [item],
    consequences: brief.consequences ?? [],
    reference,
  });

  assert.ok(!myLife.rows.some((row) => row.label === "Personal"));
  const moneyRow = myLife.rows.find((row) => row.label === "Money");
  assert.ok(moneyRow, "expected Money row");
  assert.match(moneyRow?.summary ?? "", /small money note saved/i);
}

{
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference: new Date("2026-06-14T19:30:00"), workSchedule };
  captureFromBriefInput("workout at 8pm", ctx, store.handlers);
  captureFromBriefInput("payday thursday at 5am", ctx, store.handlers);
  captureFromBriefInput("rent due friday", ctx, store.handlers);

  const brief = buildDailyBrief({ items: store.items, reference: ctx.reference, workSchedule });
  const home = buildHomePriorities({
    consequences: brief.consequences ?? [],
    items: store.items,
    reference: ctx.reference,
    workSchedule,
    hasUserContext: true,
  });

  assert.match(home.primaryPriority.text, /workout starts at 8:00 PM/i);
  assert.ok(!isTomorrowSummaryText(home.primaryPriority.text));
  const allLines = [
    home.primaryPriority.text,
    ...home.supportingPriorities.map((line) => line.text),
  ];
  const contextOnlyPrimary = allLines.every((line) =>
    /payday lands before rent|money lands before rent/i.test(line),
  );
  assert.ok(!contextOnlyPrimary, "context line should not be sole primary");
}

{
  assert.equal(
    cleanSurfacedCopy("Take Daughter to School is tomorrow."),
    "Take daughter to school tomorrow.",
  );
  assert.ok(isAwkwardSurfacedLine("Havbe to Take Daughter to Scvhool Tomorrow is tomorrow"));
  assert.ok(!isAwkwardSurfacedLine("Take daughter to school tomorrow."));
}

console.log("briefing-copy tests passed");
