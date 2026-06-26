import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildDrilldownForInsight,
  pickBestSupportingConsequence,
} from "@/lib/intelligence/consequence-link";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildLifeDrilldownView } from "@/lib/mobile-prototype/build-life-drilldown";
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
  });

  assert.match(today.insight.text, /tomorrow starts early|tight morning|looks busy/i);
  assert.ok(today.insight.drilldown, "insight should link to tomorrow drilldown");
  assert.equal(today.insight.drilldown?.kind, "day");

  assert.ok(today.priorityDetails.length >= 1);
  assert.ok(!today.priorityDetails.some((line) => /coffee|mcdonald|sad today/i.test(line.text.toLowerCase())));
  assert.ok(today.priorityDetails.every((line) => line.drilldown));

  const tomorrowTarget = buildDrilldownForInsight(today.insight.text, brief.consequences ?? [], reference);
  assert.ok(tomorrowTarget);
  const tomorrowView = buildLifeDrilldownView(tomorrowTarget!, {
    items: store.items,
    consequences: brief.consequences ?? [],
    reference,
  });
  assert.equal(tomorrowView.title, "Tomorrow");
  assert.ok(tomorrowView.timeline.some((entry) => /flight|daughter|work|payday/i.test(entry.text)));

  const best = pickBestSupportingConsequence(
    today.insight.text,
    brief.consequences ?? [],
    store.items,
    reference,
  );
  assert.ok(best);
  assert.ok(!/coffee/i.test(best!.surfaceText));
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput(
    "payday is tomorrow at 5am",
    { items: store.items, reference, workSchedule },
    store.handlers,
  );
  captureFromBriefInput(
    "rent is due friday",
    { items: store.items, reference, workSchedule },
    store.handlers,
  );

  const brief = buildDailyBrief({ items: store.items, workSchedule, reference });
  const payday = (brief.consequences ?? []).find((c) => c.kind === "income");
  assert.ok(payday);

  const moneyView = buildLifeDrilldownView(
    {
      id: "drilldown-payday",
      kind: "money",
      label: "Payday",
      area: "Money",
      sourceMemoryIds: payday!.sourceMemoryId ? [payday!.sourceMemoryId] : undefined,
    },
    { items: store.items, consequences: brief.consequences ?? [], reference },
  );
  assert.match(moneyView.lede, /financial/i);
  assert.ok(moneyView.timeline.some((entry) => /payday/i.test(entry.text)));
}

console.log("consequence-navigation tests passed");
