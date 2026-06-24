import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  isVisibleInMemoryList,
  effectiveMemoryWeight,
} from "@/lib/intelligence/memory-aging";
import { buildThreadPatternInsight } from "@/lib/intelligence/memory-thread";
import { buildMemoryReflection } from "@/lib/mobile-prototype/build-memory-reflection";
import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";

const reference = new Date("2026-06-14T18:00:00");

function item(
  partial: Partial<CapturedSyncItem> & Pick<CapturedSyncItem, "id" | "title" | "prompt">,
  createdAt: string,
): CapturedSyncItem {
  return {
    category: "general",
    destinations: ["Health"],
    dateLabel: "Today",
    timeLabel: "Flexible",
    status: "active",
    createdAt,
    updatedAt: createdAt,
    ...partial,
  };
}

{
  const oldCoffee = item(
    {
      id: "coffee-old",
      title: "Coffee",
      prompt: "had coffee",
      originalPrompt: "had coffee",
      timeline: { timelineRole: "log", startDate: "2026-05-01", label: "Today" },
    },
    "2026-05-01T12:00:00.000Z",
  );
  assert.equal(isVisibleInMemoryList(oldCoffee, [oldCoffee], reference), false);
}

{
  const stressItems = [
    item(
      {
        id: "s1",
        title: "Emotional Check-in",
        prompt: "i was sad today",
        originalPrompt: "i was sad today",
        timeline: { timelineRole: "log", startDate: "2026-06-14", label: "Today" },
      },
      "2026-06-14T12:00:00.000Z",
    ),
    item(
      {
        id: "s2",
        title: "Emotional Check-in",
        prompt: "feeling stressed",
        originalPrompt: "feeling stressed",
        timeline: { timelineRole: "log", startDate: "2026-06-10", label: "Today" },
      },
      "2026-06-10T12:00:00.000Z",
    ),
    item(
      {
        id: "s3",
        title: "Emotional Check-in",
        prompt: "anxious again",
        originalPrompt: "anxious again",
        timeline: { timelineRole: "log", startDate: "2026-06-05", label: "Today" },
      },
      "2026-06-05T12:00:00.000Z",
    ),
  ];

  assert.equal(
    effectiveMemoryWeight(stressItems[0], stressItems, reference),
    "meaningful",
  );
  const insight = buildThreadPatternInsight(stressItems[0], stressItems, reference);
  assert.match(insight ?? "", /mentioned stress often/i);
}

{
  const reflection = buildMemoryReflection(
    item(
      {
        id: "mom",
        title: "Mom's Birthday",
        prompt: "my mom's birthday is tomorrow",
        originalPrompt: "my mom's birthday is tomorrow",
        destinations: ["Family", "Calendar"],
        timeline: {
          timelineRole: "event",
          startDate: "2026-06-15",
          label: "Tomorrow",
        },
      },
      "2026-06-01T00:00:00.000Z",
    ),
    [],
    reference,
  );
  assert.match(reflection.worthLine, /worth remember|worth keeping/i);
  assert.match(reflection.contextLine, /family memories tend to matter longer/i);
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
      id: "school",
      sourceMemoryId: "school-mem",
      kind: "family_moment" as const,
      surfaceText: "Take daughter to school.",
      daysUntil: 1,
      dateKey: "2026-06-15",
      priority: 8,
      horizon: "coming_soon" as const,
      area: "family",
      briefEligible: true,
      sortMinutes: 8 * 60,
    },
  ];

  const view = buildTodayView({
    brief: {
      userName: null,
      lede: "Tomorrow looks busy.",
      isEmpty: false,
      sections: [
        {
          id: "noticing",
          label: "Tomorrow",
          paragraphs: ["Flight at 6:00 AM.", "Take daughter to school."],
        },
      ],
      consequences,
    },
    consequences,
    items: [],
  });
  assert.match(view.insight.text, /tomorrow starts early|tight morning/i);
  assert.equal(view.insight.drilldown?.kind, "day");
  assert.ok(view.priorityDetails.length >= 1);
  assert.match(view.priorityDetails[0]!.text, /flight|daughter|school/i);
}

console.log("memory-life-system tests passed");
