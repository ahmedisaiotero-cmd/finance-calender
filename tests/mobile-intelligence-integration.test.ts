import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { memoryFilterCategory } from "@/lib/mobile-prototype/memory-category";
import { whySyncRemembers } from "@/lib/mobile-prototype/build-memory-detail";
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
    destinations: ["Family", "Calendar"],
    dateLabel: "Tomorrow",
    timeLabel: "Flexible",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

{
  const items: CapturedSyncItem[] = [
    timedItem({
      id: "flight",
      title: "Flight",
      prompt: "Flight tomorrow at 6 AM",
      originalPrompt: "Flight tomorrow at 6 AM",
      destinations: ["Calendar", "Work"],
      timeline: {
        timelineRole: "event",
        startDate: "2026-06-15",
        startTime: "06:00",
        isTimed: true,
        label: "Tomorrow",
      },
      meaning: {
        importance: "high",
        meaningLabel: "Travel commitment",
        summary: "Early travel tomorrow needs attention.",
        protection: { eligible: true, recommended: false, protected: false },
        suggestedActions: [],
      },
    }),
    timedItem({
      id: "school",
      title: "School drop-off",
      prompt: "Take daughter to school tomorrow at 7:30 AM",
      originalPrompt: "Take daughter to school tomorrow at 7:30 AM",
      destinations: ["Family", "School", "Calendar"],
      timeline: {
        timelineRole: "event",
        startDate: "2026-06-15",
        startTime: "07:30",
        isTimed: true,
        label: "Tomorrow",
      },
      meaning: {
        importance: "high",
        meaningLabel: "Family commitment",
        summary: "Family school drop-off tomorrow morning.",
        protection: { eligible: true, recommended: true, protected: false },
        suggestedActions: [],
      },
    }),
  ];

  const store = createTestCaptureStore();
  captureFromBriefInput("Payday is tomorrow", { items: store.items, reference }, store.handlers);
  captureFromBriefInput(
    "My friend's birthday is tomorrow",
    { items: store.items, reference },
    store.handlers,
  );

  const allItems = [...items, ...store.items];
  const brief = buildDailyBrief({
    items: allItems,
    workSchedule,
    reference,
  });

  assert.match(brief.lede, /Tomorrow looks busy/i);
  const tomorrowSection = brief.sections.find((section) => section.label === "Tomorrow");
  const comingSoon = tomorrowSection?.paragraphs ?? brief.sections.flatMap((s) => s.paragraphs);
  assert.ok(comingSoon.length >= 3, `expected multiple tomorrow lines, got: ${comingSoon.join(" | ")}`);
  assert.ok(
    comingSoon.some((line) => /flight at 6/i.test(line)),
    "flight should appear as a timed consequence",
  );
  assert.ok(
    comingSoon.some((line) => /take daughter to school/i.test(line)),
    "school drop-off should use family phrasing",
  );
  assert.ok(
    comingSoon.some((line) => /friend's birthday/i.test(line)),
    "friend birthday should appear in tomorrow",
  );
  assert.ok(
    comingSoon.some((line) => /work begins at 11/i.test(line)),
    "work should surface on a busy tomorrow with load-aware phrasing",
  );

  const flightIdx = comingSoon.findIndex((line) => /flight/i.test(line));
  const schoolIdx = comingSoon.findIndex((line) => /daughter/i.test(line));
  assert.ok(flightIdx >= 0 && schoolIdx >= 0 && flightIdx < schoolIdx);
}

{
  const consequences = buildAllConsequences({
    items: [
      timedItem({
        id: "protected-family",
        title: "Dinner with daughter",
        prompt: "Dinner with daughter tomorrow at 6 PM",
        destinations: ["Family", "Calendar"],
        timeline: {
          timelineRole: "event",
          startDate: "2026-06-15",
          startTime: "18:00",
          isTimed: true,
          label: "Tomorrow",
        },
      }),
    ],
    reference,
    workSchedule: null,
  });

  assert.ok(
    consequences.some((c) => c.kind === "family_moment" && /6/i.test(c.surfaceText)),
    "timed family blocks should become consequences",
  );
}

{
  const store = createTestCaptureStore();
  const captured = captureFromBriefInput(
    "Take daughter to school tomorrow at 7:30 AM",
    { items: store.items, reference },
    store.handlers,
  );
  assert.ok(
    ["high", "critical"].includes(captured?.meaning.importance ?? ""),
    "meaning engine should mark family school as high/critical importance",
  );
  assert.equal(memoryFilterCategory(store.items[0]), "Family");
  assert.ok(whySyncRemembers(store.items[0], reference).length > 10);
}

console.log("mobile-intelligence-integration tests passed");
