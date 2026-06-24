import assert from "node:assert/strict";

import { buildDrilldownForConsequence } from "@/lib/intelligence/consequence-link";
import { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
import { buildCaptureConfirmation } from "@/lib/mobile-prototype/build-capture-confirmation";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildLifeDrilldownView } from "@/lib/mobile-prototype/build-life-drilldown";
import { buildLifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";
import { buildMyLifeOverview } from "@/lib/mobile-prototype/build-my-life";
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

function capture(text: string, store = createTestCaptureStore()) {
  const result = captureFromBriefInput(
    text,
    { items: store.items, reference, workSchedule },
    store.handlers,
  );
  assert.ok(result, `expected capture to save: ${text}`);
  return { store, item: store.items[0]! };
}

{
  const { store, item } = capture("workout at 8pm");
  assert.equal(buildMemoryProfile(item, reference).area, "Health");

  const brief = buildDailyBrief({ items: store.items, reference });
  const consequences = brief.consequences ?? [];
  const timeline = buildLifeTimelineView({
    consequences,
    items: store.items,
    reference,
  });
  const today = timeline.groups.find((group) => group.label === "Today");
  assert.ok(today);
  assert.ok(
    today!.entries.some(
      (entry) => entry.time === "8:00 PM" && /workout/i.test(entry.text),
    ),
  );

  const myLife = buildMyLifeOverview({
    items: store.items,
    consequences,
    reference,
  });
  assert.ok(myLife.rows.some((row) => row.label === "Health"));
  assert.match(myLife.rows.find((row) => row.label === "Health")!.summary, /workout/i);

  const confirmation = buildCaptureConfirmation(item, { reference, consequences });
  assert.equal(confirmation.headline, "Remembered.");
  assert.match(confirmation.line, /Health · Tonight at 8:00 PM/i);
  assert.ok(confirmation.target);
}

{
  const store = createTestCaptureStore();
  capture("payday is tomorrow at 5am", store);
  capture("rent is due friday", store);

  const brief = buildDailyBrief({
    items: store.items,
    workSchedule,
    reference,
  });
  const consequences = brief.consequences ?? [];

  const timeline = buildLifeTimelineView({
    consequences,
    items: store.items,
    reference,
  });
  const tomorrow = timeline.groups.find((group) => group.label === "Tomorrow");
  const paydayEntries =
    tomorrow?.entries.filter((entry) => /payday/i.test(entry.text)) ?? [];
  assert.equal(paydayEntries.length, 1);
  assert.equal(paydayEntries[0]?.time, "5:00 AM");
  assert.ok(
    !timeline.groups.some((group) =>
      group.entries.some((entry) => /tomorrow is open after/i.test(entry.text)),
    ),
  );

  const money = buildLifeDrilldownView(
    { id: "money", kind: "money", label: "Money", area: "Money" },
    { items: store.items, consequences, reference },
  );
  const moneyPayday = money.timeline.find((entry) => /payday/i.test(entry.text));
  assert.ok(moneyPayday);
  assert.match(moneyPayday!.text, /5:00 AM/);
  assert.ok(!/12:00 PM/.test(moneyPayday!.text));
}

{
  const store = createTestCaptureStore();
  for (const text of [
    "payday is tomorrow at 5am",
    "i have a flight tomorrow at 6am",
    "my friend's birthday is tomorrow",
    "my daughter has school tomorrow",
    "i spent like 9 bucks at mcdonalds earlier",
    "i had coffee this morning",
  ]) {
    captureFromBriefInput(
      text,
      { items: store.items, reference, workSchedule },
      store.handlers,
    );
  }

  const brief = buildDailyBrief({ items: store.items, workSchedule, reference });
  const myLife = buildMyLifeOverview({
    items: store.items,
    consequences: brief.consequences ?? [],
    reference,
  });

  assert.ok(!myLife.rows.some((row) => /a few .* moments sync is holding/i.test(row.summary)));
  assert.ok(!myLife.rows.some((row) => /few .* moments/i.test(row.summary)));

  const timeline = buildLifeTimelineView({
    consequences: brief.consequences ?? [],
    items: store.items,
    reference,
  });
  assert.ok(
    !timeline.groups.some((group) =>
      group.entries.some(
        (entry) =>
          /new task is tomorrow/i.test(entry.text) ||
          /payday is tomorrow/i.test(entry.text),
      ),
    ),
  );
}

{
  const { item } = capture("gym tomorrow at 4pm");
  const brief = buildDailyBrief({ items: [item], workSchedule, reference });
  const consequence = (brief.consequences ?? []).find(
    (entry) => entry.sourceMemoryId === item.id,
  );
  assert.ok(consequence);
  const target = buildDrilldownForConsequence(consequence!, [item], reference);
  assert.equal(target.kind, "health");
}

console.log("capture-trust tests passed");
