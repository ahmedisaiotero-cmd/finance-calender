import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";
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

function timedItem(
  partial: Partial<CapturedSyncItem> & Pick<CapturedSyncItem, "id" | "title" | "prompt">,
): CapturedSyncItem {
  return {
    category: "task",
    destinations: ["Calendar"],
    dateLabel: "Tomorrow",
    timeLabel: "Flexible",
    status: "active",
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:00:00.000Z",
    ...partial,
  };
}

{
  const store = createTestCaptureStore();
  const captures = [
    "payday is tomorrow at 5am",
    "rent is due friday",
    "i have a flight tomorrow at 6am",
    "i havbe to take duaghter to svchool tomorrow",
    "i spent like 9 bucks at mcdonalds earlier",
    "i had coffee this morning",
    "i was sad today",
  ];

  for (const text of captures) {
    captureFromBriefInput(text, { items: store.items, reference, workSchedule }, store.handlers);
  }

  store.items.push(
    timedItem({
      id: "work-block",
      title: "Work",
      prompt: "i worked sunday through wednesday 11 to 9",
      originalPrompt: "i worked sunday through wednesday 11 to 9",
      category: "workday",
      destinations: ["Work"],
      timeline: {
        timelineRole: "event",
        startDate: "2026-06-15",
        label: "Tomorrow",
      },
    }),
  );

  const brief = buildDailyBrief({
    items: store.items,
    workSchedule,
    reference,
  });

  const today = buildTodayView({
    brief,
    consequences: brief.consequences ?? [],
    items: store.items,
    reference,
    workSchedule,
  });

  assert.match(
    today.primaryPriority.text,
    /tomorrow starts early|tight morning|payday|flight|take daughter to school/i,
  );
  assert.ok(today.supportingPriorities.length >= 2);
  assert.ok(today.supportingPriorities.length <= 4);
  assert.ok(!today.supportingPriorities.some((line) => /coffee|mcdonald/i.test(line.text)));
  assert.ok(
    !today.supportingPriorities.some((line) => /tomorrow is tomorrow/i.test(line.text)),
  );
  assert.ok(!today.supportingPriorities.some((line) => /coffee is today/i.test(line.text)));
  assert.equal(today.sectionLabel, null);
  assert.equal(today.forecastLabel, null);
  assert.ok(today.futureContext?.text || today.supportingPriorities.length > 0);
}

console.log("home-structure tests passed");
