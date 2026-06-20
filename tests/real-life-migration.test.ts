import assert from "node:assert/strict";

import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildMemoryDetail } from "@/lib/mobile-prototype/build-memory-detail";
import { memoryFilterCategory } from "@/lib/mobile-prototype/memory-category";
import { scoreMemoryImportance } from "@/lib/intelligence/importance-scoring";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
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

function capture(text: string, existing: ReturnType<typeof createTestCaptureStore>["items"] = []) {
  const store = createTestCaptureStore(existing);
  const result = captureFromBriefInput(
    text,
    { items: store.items, reference, workSchedule },
    store.handlers,
  );
  assert.ok(result, `expected capture for: ${text}`);
  return { store, item: store.items[store.items.length - 1] };
}

{
  const { item } = capture("flight tomorrow 6 am");
  assert.match(displayMemoryTitle(item), /flight/i);
  assert.equal(item.timeline?.startDate, "2026-06-15");
  assert.equal(item.timeline?.startTime, "06:00");
  assert.equal(scoreMemoryImportance(item, reference), "critical");

  const brief = buildDailyBrief({ items: [item], workSchedule: null, reference });
  assert.match(brief.lede, /tomorrow starts early/i);
}

{
  const { item } = capture("i havbe to take duaghter to svchool tomorrow");
  assert.match(displayMemoryTitle(item), /take daughter to school/i);
  assert.equal(memoryFilterCategory(item), "Family");
  assert.equal(item.timeline?.startDate, "2026-06-15");
  assert.ok(
    ["critical", "high"].includes(scoreMemoryImportance(item, reference)),
    "school drop-off tomorrow should rank high",
  );
}

{
  const { item } = capture("send mama ghordita car money next week");
  const category = memoryFilterCategory(item);
  assert.ok(
    category === "Family" || category === "Money",
    `expected family or money routing, got ${category}`,
  );
  assert.ok(
    ["medium", "high"].includes(scoreMemoryImportance(item, reference)),
    "family money transfer should not be low",
  );
}

{
  const { item } = capture("my best friends bday is tomorrow");
  assert.match(displayMemoryTitle(item), /friend's birthday/i);
  assert.equal(memoryFilterCategory(item), "Relationships");
  assert.equal(scoreMemoryImportance(item, reference), "high");

  const brief = buildDailyBrief({ items: [item], workSchedule, reference });
  assert.match(brief.lede, /friend's birthday is tomorrow/i);
}

{
  const { item } = capture("i get paid every other thursday");
  assert.match(displayMemoryTitle(item), /payday/i);
  assert.equal(memoryFilterCategory(item), "Money");
  assert.ok(item.timeline?.recurrence, "payday should have recurrence");
}

{
  const { item } = capture("i dont work tomorrow");
  assert.match(displayMemoryTitle(item), /day off tomorrow/i);
  assert.equal(memoryFilterCategory(item), "Work");

  const brief = buildDailyBrief({ items: [item], workSchedule, reference });
  assert.match(brief.lede, /off tomorrow/i);
}

{
  const { item } = capture("rent is due friday");
  assert.match(displayMemoryTitle(item), /rent due/i);
  assert.equal(memoryFilterCategory(item), "Money");
  assert.equal(scoreMemoryImportance(item, reference), "high");
}

{
  const { item } = capture("i went to the gym yesterday");
  assert.match(displayMemoryTitle(item), /workout|gym/i);
  assert.equal(memoryFilterCategory(item), "Health");
  assert.ok(
    ["low", "medium"].includes(scoreMemoryImportance(item, reference)),
    "past gym visit should stay low/medium",
  );

  const brief = buildDailyBrief({ items: [item], workSchedule, reference });
  assert.doesNotMatch(brief.lede, /gym|workout/i);
}

{
  const { item } = capture("ate pizza yesterday");
  assert.match(displayMemoryTitle(item), /pizza|ate/i);
  assert.equal(scoreMemoryImportance(item, reference), "low");

  const brief = buildDailyBrief({ items: [item], workSchedule, reference });
  assert.doesNotMatch(brief.lede, /pizza/i);
}

{
  const { item } = capture("world cup games in 15 days");
  assert.match(displayMemoryTitle(item), /world cup/i);
  assert.equal(item.timeline?.startDate, "2026-06-29");
  assert.ok(
    ["low", "medium"].includes(scoreMemoryImportance(item, reference)),
    "distant event should stay low/medium",
  );

  const brief = buildDailyBrief({ items: [item], workSchedule, reference });
  assert.doesNotMatch(brief.lede, /world cup/i);
}

{
  const store = createTestCaptureStore();
  for (const text of [
    "flight tomorrow 6 am",
    "i havbe to take duaghter to svchool tomorrow",
    "Payday is tomorrow",
    "my best friends bday is tomorrow",
  ]) {
    captureFromBriefInput(
      text,
      { items: store.items, reference, workSchedule },
      store.handlers,
    );
  }

  const brief = buildDailyBrief({
    items: store.items,
    workSchedule,
    reference,
  });

  assert.match(brief.lede, /tomorrow looks busy/i);
  const comingSoon = brief.sections.flatMap((section) => section.paragraphs);
  assert.ok(comingSoon.some((line) => /flight at 6/i.test(line)));
  assert.ok(comingSoon.some((line) => /take daughter to school/i.test(line)));
  assert.ok(comingSoon.some((line) => /friend's birthday/i.test(line)));
  assert.ok(
    comingSoon.some((line) => /work begins at 11/i.test(line)),
    `work should appear on busy tomorrow, got: ${comingSoon.join(" | ")}`,
  );

  const detail = buildMemoryDetail(store.items[0], store.items, {
    reference,
    workSchedule,
    brief,
  });
  assert.ok(detail.importance.length > 0);
  assert.ok(detail.cleanedSummary.length > 0);
}

console.log("real-life-migration tests passed");
