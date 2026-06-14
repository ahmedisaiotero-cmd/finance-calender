import assert from "node:assert/strict";

import {
  buildCalendarMonthView,
  buildCalendarTimeBlocksForMonth,
  captureItemToTimeBlock,
  detectCalendarOverlapWarnings,
  findOverlappingTimeBlocks,
  proposedTimeBlocksFromPlan,
  timeBlocksOverlap,
} from "@/lib/calendar-time-blocks";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import type { CapturedSyncItem } from "@/lib/captured-items";

const reference = new Date("2026-06-10T12:00:00");

function makeCapture(
  partial: Partial<CapturedSyncItem> & Pick<CapturedSyncItem, "id" | "title" | "timeline">,
): CapturedSyncItem {
  return {
    category: "workout",
    prompt: partial.title,
    destinations: ["Calendar", "Health"],
    dateLabel: "Wednesday",
    timeLabel: "6:00 PM",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

{
  const block = captureItemToTimeBlock(
    makeCapture({
      id: "gym-1",
      title: "Gym",
      timeline: {
        kind: "single_date",
        startDate: "2026-06-11",
        startTime: "18:00",
        endTime: "19:00",
        isTimed: true,
        timelineRole: "event",
        confidence: 0.9,
        confidenceLabel: "high",
        needsConfirmation: false,
        tense: "future",
        label: "Tomorrow",
        sourceText: "gym tomorrow 6pm",
        scheduleInferenceApplied: false,
        timeSource: "input",
      },
    }),
    reference,
  );

  assert.equal(block?.date, "2026-06-11");
  assert.equal(block?.startMinutes, 18 * 60);
  assert.equal(block?.endMinutes, 19 * 60);
}

{
  const workBlock = {
    id: "work-1",
    date: "2026-06-11",
    title: "Work",
    startMinutes: 11 * 60,
    endMinutes: 21 * 60,
    source: "schedule" as const,
    isAllDay: false,
  };
  const gymBlock = {
    id: "gym-1",
    date: "2026-06-11",
    title: "Gym",
    startMinutes: 18 * 60,
    endMinutes: 19 * 60,
    source: "capture" as const,
    isAllDay: false,
  };

  assert.equal(timeBlocksOverlap(workBlock, gymBlock), true);
  assert.deepEqual(findOverlappingTimeBlocks(gymBlock, [workBlock]), [workBlock]);
}

{
  const items = [
    makeCapture({
      id: "work-existing",
      title: "Work",
      destinations: ["Calendar", "Work"],
      timeline: {
        kind: "single_date",
        startDate: "2026-06-11",
        startTime: "11:00",
        endTime: "21:00",
        isTimed: true,
        timelineRole: "event",
        confidence: 0.9,
        confidenceLabel: "high",
        needsConfirmation: false,
        tense: "future",
        label: "Thursday",
        sourceText: "work thursday",
        scheduleInferenceApplied: false,
        timeSource: "input",
      },
    }),
  ];

  const plan = createPulsePlan("gym tomorrow at 6pm", {
    timeline: { now: reference, userContext: {} },
  });

  const warnings = detectCalendarOverlapWarnings({
    plan,
    items,
    reference,
  });

  assert.ok(warnings.length >= 1);
  assert.match(warnings[0].message, /Overlaps with Work/i);
}

{
  const blocks = buildCalendarTimeBlocksForMonth({
    items: [],
    year: 2026,
    month: 5,
    workSchedule: {
      days: ["MO", "WE"],
      startTime: "09:00",
      endTime: "17:00",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        startsOn: "2026-06-01",
        endsOn: null,
      },
      status: "active",
    },
  });

  assert.ok(blocks.some((block) => block.date === "2026-06-08"));
  assert.ok(blocks.some((block) => block.date === "2026-06-10"));
}

{
  const view = buildCalendarMonthView({
    items: [],
    year: 2026,
    month: 5,
    reference,
    workSchedule: {
      days: ["MO"],
      startTime: "11:00",
      endTime: "21:00",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        startsOn: "2026-06-01",
        endsOn: null,
      },
      status: "active",
    },
  });

  const mondayEvents = view.eventsByDate.get("2026-06-08") ?? [];
  assert.equal(mondayEvents[0]?.title, "Work");
  assert.match(mondayEvents[0]?.detail?.time ?? "", /11:00 AM – 9:00 PM/);
}

{
  const schedulePlan = createPulsePlan(
    "my work schedule is sunday through monday 11 to 9pm",
    { timeline: { now: reference, userContext: {} } },
  );
  const proposed = proposedTimeBlocksFromPlan(schedulePlan, reference);
  assert.ok(proposed.length >= 2);
  assert.ok(proposed.every((block) => block.startMinutes === 11 * 60));
}

console.log("calendar-time-blocks tests passed");
