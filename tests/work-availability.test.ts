import assert from "node:assert/strict";

import {
  collectWorkDayOffDateKeys,
  detectWorkAvailability,
  isWorkDayOffItem,
  isWorkDayOffLanguage,
  shouldSuppressWorkScheduleOnDate,
} from "@/lib/sync-capture/work-availability";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { createTestTimelineResolution } from "@/tests/test-fixtures";

assert.equal(isWorkDayOffLanguage("I don't work tomorrow"), true);
assert.equal(isWorkDayOffLanguage("i dont work tomorrow"), true);
assert.equal(isWorkDayOffLanguage("I'm off Friday"), true);
assert.equal(isWorkDayOffLanguage("cancel work tomorrow"), true);
assert.equal(isWorkDayOffLanguage("I have overtime tomorrow"), false);
assert.equal(isWorkDayOffLanguage("I work Sunday through Wednesday"), false);

assert.equal(detectWorkAvailability("I don't work tomorrow"), "off");
assert.equal(detectWorkAvailability("I have overtime tomorrow"), "overtime");

assert.equal(
  isWorkDayOffItem({
    title: "Day Off Tomorrow",
    prompt: "I don't work tomorrow",
    workAvailability: "off",
  }),
  true,
);

{
  const reference = new Date("2026-06-14T12:00:00");
  const items: CapturedSyncItem[] = [
    {
      id: "off",
      title: "Day Off Tomorrow",
      category: "workday",
      prompt: "I don't work tomorrow",
      workAvailability: "off",
      destinations: ["Work", "Calendar"],
      dateLabel: "Tomorrow",
      timeLabel: "Flexible",
      timeline: createTestTimelineResolution({
        timelineRole: "event",
        startDate: "2026-06-15",
        label: "Tomorrow",
      }),
      status: "active",
      createdAt: "2026-06-14T00:00:00.000Z",
      updatedAt: "2026-06-14T00:00:00.000Z",
    },
  ];

  const dayOffDates = collectWorkDayOffDateKeys(items, reference);
  assert.equal(dayOffDates.has("2026-06-15"), true);
  assert.equal(shouldSuppressWorkScheduleOnDate("2026-06-15", dayOffDates), true);
  assert.equal(shouldSuppressWorkScheduleOnDate("2026-06-16", dayOffDates), false);
}

console.log("work-availability tests passed");
