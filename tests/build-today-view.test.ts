import assert from "node:assert/strict";

import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";

{
  const empty = buildTodayView({
    brief: {
      userName: null,
      lede: "Quiet for now — nothing pressing.",
      sections: [],
      isEmpty: true,
      consequences: [],
    },
    consequences: [],
    items: [],
  });
  assert.equal(empty.priorityDetails.length, 0);
  assert.match(empty.headline.text, /tell sync|on your mind/i);
}

{
  const consequences = [
    {
      id: "flight",
      sourceMemoryId: "flight-mem",
      kind: "event" as const,
      surfaceText: "Flight at 6:00 AM.",
      daysUntil: 1,
      dateKey: "2026-06-15",
      priority: 5,
      horizon: "coming_soon" as const,
      area: "calendar",
      briefEligible: true,
      sortMinutes: 6 * 60,
    },
    {
      id: "payday",
      sourceMemoryId: "payday-mem",
      kind: "income" as const,
      surfaceText: "Payday lands tomorrow.",
      daysUntil: 1,
      dateKey: "2026-06-15",
      priority: 20,
      horizon: "coming_soon" as const,
      area: "finance",
      briefEligible: true,
      sortMinutes: 5 * 60,
    },
    {
      id: "work",
      sourceMemoryId: "work-mem",
      kind: "work_start" as const,
      surfaceText: "Work begins at 11:00 AM.",
      daysUntil: 1,
      dateKey: "2026-06-15",
      priority: 12,
      horizon: "coming_soon" as const,
      area: "work",
      briefEligible: true,
      sortMinutes: 11 * 60,
    },
  ];

  const view = buildTodayView({
    brief: {
      userName: "Ahmed",
      lede: "Tomorrow looks busy.",
      isEmpty: false,
      sections: [],
      consequences,
    },
    consequences,
    items: [],
  });

  assert.match(view.headline.text, /tomorrow starts early|tight morning/i);
  assert.ok(view.details.length >= 2);
  assert.ok(view.details.length <= 4);
  assert.ok(
    view.details.some((line) => /flight/i.test(line.text)),
  );
  assert.ok(
    view.details.some((line) => /payday/i.test(line.text)),
  );
  assert.ok(!view.details.some((line) => /coffee/i.test(line.text)));
}

console.log("build-today-view tests passed");
