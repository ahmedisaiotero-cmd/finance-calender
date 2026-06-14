import assert from "node:assert/strict";

import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildCalendarMonthView,
  buildSyncTimeBlocksForMonth,
  detectSyncTimeBlockOverlaps,
  filterSyncTimeBlocksByArea,
  formatSyncTimeBlockCellLabel,
  formatWorkScheduleDaysLabel,
  proposedSyncTimeBlocksFromPlan,
} from "@/lib/sync-time-blocks";
import { generateAmbientInsightFromBlocks } from "@/lib/time-block-insights";
import { summarizeWorkLensSchedule } from "@/lib/time-block-insights";

const reference = new Date("2026-06-09T12:00:00");

const workSchedule = {
  days: ["SU", "MO", "TU", "WE"],
  startTime: "11:00",
  endTime: "21:00",
  recurrence: {
    frequency: "weekly" as const,
    interval: 1,
    startsOn: "2026-06-01",
    endsOn: null,
  },
  status: "active" as const,
};

function makeCapture(
  partial: Partial<CapturedSyncItem> & Pick<CapturedSyncItem, "id" | "title" | "timeline">,
): CapturedSyncItem {
  return {
    category: "workout",
    prompt: partial.title,
    destinations: ["Calendar", "Health"],
    dateLabel: "Thursday",
    timeLabel: "6:00 PM",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

{
  const blocks = buildSyncTimeBlocksForMonth({
    items: [],
    year: 2026,
    month: 5,
    workSchedule,
  });

  assert.ok(blocks.length > 0);
  assert.ok(blocks.every((block) => block.blockType === "schedule"));
  assert.ok(blocks.every((block) => block.area === "work"));
  assert.equal(blocks[0].startTime, "11:00");
  assert.equal(blocks[0].endTime, "21:00");
  assert.ok(blocks.some((block) => block.date === "2026-06-08"));
}

{
  const view = buildCalendarMonthView({
    items: [],
    year: 2026,
    month: 5,
    reference,
    workSchedule,
  });

  const wednesdayBlocks = view.blocks.filter((block) => block.date === "2026-06-10");
  assert.equal(wednesdayBlocks[0]?.title, "Work");
  assert.equal(formatSyncTimeBlockCellLabel(wednesdayBlocks[0]!), "11:00 AM Work");
}

{
  const gymDuring = createPulsePlan("gym tomorrow at 6pm", {
    timeline: { now: reference, userContext: {} },
  });

  const overlaps = detectSyncTimeBlockOverlaps({
    plan: gymDuring,
    items: [],
    workSchedule,
    reference,
  });

  assert.ok(overlaps.length >= 1);
  assert.equal(overlaps[0].headline, "This overlaps with Work.");
  assert.match(overlaps[0].existingRange, /11:00 AM–9:00 PM/);
  assert.match(overlaps[0].proposedRange, /6:00 PM/);

  const preview = buildSyncPreviewViewModel(gymDuring, {
    calendarItems: [],
    workSchedule,
  });
  assert.ok(preview.when.overlap);
  assert.equal(preview.when.overlap?.headline, "This overlaps with Work.");
}

{
  const gymAfter = createPulsePlan("gym tomorrow at 10pm", {
    timeline: { now: reference, userContext: {} },
  });

  const overlaps = detectSyncTimeBlockOverlaps({
    plan: gymAfter,
    items: [],
    workSchedule,
    reference,
  });

  assert.equal(overlaps.length, 0);
}

{
  const workBlocks = filterSyncTimeBlocksByArea(
    buildSyncTimeBlocksForMonth({
      items: [],
      year: 2026,
      month: 5,
      workSchedule,
    }),
    "work",
  );

  const summary = summarizeWorkLensSchedule(workBlocks);
  assert.ok(summary);
  assert.equal(summary?.title, "Work Schedule");
  assert.match(summary?.range ?? "", /11:00 AM–9:00 PM/);
  assert.equal(
    formatWorkScheduleDaysLabel(workSchedule.days),
    "Every Sunday, Monday, Tuesday and Wednesday",
  );
}

{
  const schedulePlan = createPulsePlan(
    "my work schedule is sunday through wednesday 11am to 9pm",
    { timeline: { now: reference, userContext: {} } },
  );
  const proposed = proposedSyncTimeBlocksFromPlan(schedulePlan, reference);
  assert.ok(proposed.length >= 4);
  assert.ok(proposed.every((block) => block.blockType === "schedule"));
}

{
  const blocks = buildSyncTimeBlocksForMonth({
    items: [],
    year: 2026,
    month: 5,
    workSchedule,
  });
  const insight = generateAmbientInsightFromBlocks(blocks, reference);
  assert.ok(
    /busy|open|overlap|after/i.test(insight),
    `expected ambient insight, got: ${insight}`,
  );
}

console.log("sync-time-blocks tests passed");
