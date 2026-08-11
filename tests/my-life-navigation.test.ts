import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildLifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";
import {
  buildMyLifeOverview,
  resolveLifeScreenForTarget,
} from "@/lib/mobile-prototype/build-my-life";
import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";
import { buildDrilldownForConsequence } from "@/lib/intelligence/consequence-link";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";
import {
  createTestTimelineResolution,
  createTestWorkSchedule,
} from "@/tests/test-fixtures";

const reference = new Date("2026-06-14T18:00:00");

const workSchedule = createTestWorkSchedule();

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
    "i work sunday through wednesday 11 to 9",
    "my daughter has school tomorrow",
    "my friend's birthday is tomorrow",
    "my anniversary is friday",
    "i spent like 9 bucks at mcdonalds earlier",
    "i had coffee this morning",
    "i was sad today",
    "i feel stressed again",
  ];

  for (const text of captures) {
    captureFromBriefInput(text, { items: store.items, reference, workSchedule }, store.handlers);
  }

  store.items.push(
    timedItem({
      id: "work-block",
      title: "Work",
      prompt: "i work sunday through wednesday 11 to 9",
      originalPrompt: "i work sunday through wednesday 11 to 9",
      category: "workday",
      destinations: ["Work"],
      timeline: createTestTimelineResolution({
        timelineRole: "event",
        startDate: "2026-06-15",
        label: "Tomorrow",
      }),
    }),
  );

  const brief = buildDailyBrief({
    items: store.items,
    workSchedule,
    reference,
  });
  const consequences = brief.consequences ?? [];

  const today = buildTodayView({
    brief,
    consequences,
    items: store.items,
    reference,
  });

  assert.ok(today.insight.text.length > 0);
  assert.ok(today.priorityDetails.length >= 2);
  assert.ok(today.details.length <= 4);
  assert.ok(!today.priorityDetails.some((line) => /coffee|mcdonald/i.test(line.text)));

  const myLife = buildMyLifeOverview({
    items: store.items,
    consequences,
    reference,
  });

  assert.ok(!myLife.isEmpty);
  assert.ok(myLife.rows.some((row) => row.label === "Life Timeline"));
  assert.ok(myLife.rows.some((row) => row.label === "Money"));
  // Personal may appear when light captures (coffee, etc.) are saved universally.

  const timeline = buildLifeTimelineView({
    consequences,
    items: store.items,
    reference,
  });

  assert.ok(timeline.groups.length > 0);
  const tomorrow = timeline.groups.find((group) => group.label === "Tomorrow");
  assert.ok(tomorrow);
  assert.ok(tomorrow!.entries.some((entry) => /flight|payday/i.test(entry.text)));
  assert.ok(!tomorrow!.entries.some((entry) => /coffee is today/i.test(entry.text)));

  const payday = consequences.find((c) => c.kind === "income");
  assert.ok(payday);
  const paydayTarget = buildDrilldownForConsequence(payday!, store.items, reference);
  assert.equal(resolveLifeScreenForTarget(paydayTarget), "area");
  assert.equal(paydayTarget.kind, "money");

  const flight = consequences.find((c) => /\bflight\b/i.test(c.surfaceText));
  assert.ok(flight);
  const flightTarget = buildDrilldownForConsequence(flight!, store.items, reference);
  assert.equal(resolveLifeScreenForTarget(flightTarget), "timeline");

  const birthday = consequences.find((c) => /\bbirthday\b/i.test(c.surfaceText));
  assert.ok(birthday);
  const birthdayTarget = buildDrilldownForConsequence(birthday!, store.items, reference);
  assert.equal(birthdayTarget.kind, "relationship");

  const school = consequences.find((c) => /\bschool|daughter\b/i.test(c.surfaceText));
  assert.ok(school);
  const schoolTarget = buildDrilldownForConsequence(school!, store.items, reference);
  assert.equal(schoolTarget.kind, "family");
}

console.log("my-life-navigation tests passed");
