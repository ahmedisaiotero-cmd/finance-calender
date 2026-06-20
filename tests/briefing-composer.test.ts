import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { composeCuratedBrief } from "@/lib/intelligence/briefing-composer";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import {
  BRIEF_EMPTY_NO_CONTEXT,
  BRIEF_EMPTY_QUIET,
} from "@/lib/mobile-prototype/sync-voice";

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
  const consequences = buildAllConsequences({
    items: [
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
      }),
      timedItem({
        id: "birthday",
        title: "Friend's Birthday",
        prompt: "My friend's birthday is tomorrow",
        originalPrompt: "My friend's birthday is tomorrow",
        destinations: ["Relationships", "Calendar"],
        timeline: {
          timelineRole: "event",
          startDate: "2026-06-15",
          label: "Tomorrow",
        },
      }),
    ],
    workSchedule,
    reference,
  });

  const brief = composeCuratedBrief({
    consequences,
    priorities: ["Family"],
    hasUserContext: true,
    emptyNoContext: BRIEF_EMPTY_NO_CONTEXT,
    emptyQuiet: BRIEF_EMPTY_QUIET,
  });

  assert.equal(brief.lede, "Tomorrow looks busy.");
  assert.ok(brief.sections.some((section) => section.label === "Tomorrow"));
  const tomorrow = brief.sections.find((section) => section.label === "Tomorrow");
  assert.ok(tomorrow);
  assert.ok(tomorrow!.paragraphs.length <= 5);
  assert.ok(tomorrow!.paragraphs.length >= 3);
  assert.ok(
    tomorrow!.paragraphs.some((line) => /work begins at 11/i.test(line)),
    "work line should use load-aware phrasing",
  );

  const totalLines = brief.sections.reduce(
    (count, section) => count + section.paragraphs.length,
    0,
  );
  assert.ok(totalLines <= 7, `brief should cap noise, got ${totalLines} lines`);
}

{
  const consequences = buildAllConsequences({
    items: [
      timedItem({
        id: "payday",
        title: "Payday",
        prompt: "Payday Thursday",
        destinations: ["Finance", "Calendar"],
        parsedInput: { moneyType: "income" },
        timeline: {
          timelineRole: "task",
          kind: "recurring",
          startDate: "2026-06-19",
          recurrence: { frequency: "weekly", days: ["Thursday"] },
          label: "Thursday",
        },
      }),
      timedItem({
        id: "rent",
        title: "Rent",
        prompt: "rent is due friday",
        category: "reminder",
        destinations: ["Finance", "Calendar"],
        timeline: {
          timelineRole: "deadline",
          deadlineDate: "2026-06-20",
          startDate: "2026-06-20",
          label: "Friday",
        },
      }),
    ],
    workSchedule,
    reference,
  });

  const familyFirst = composeCuratedBrief({
    consequences,
    priorities: ["Money"],
    hasUserContext: true,
    emptyNoContext: BRIEF_EMPTY_NO_CONTEXT,
    emptyQuiet: BRIEF_EMPTY_QUIET,
  });

  const thisWeek = familyFirst.sections.find((section) => section.label === "This Week");
  assert.ok(thisWeek);
  const paydayIdx = thisWeek!.paragraphs.findIndex((line) => /payday/i.test(line));
  const rentIdx = thisWeek!.paragraphs.findIndex((line) => /rent/i.test(line));
  assert.ok(paydayIdx >= 0 && rentIdx >= 0);
  assert.ok(paydayIdx < rentIdx, "Money priority should surface payday before rent");
}

console.log("briefing-composer tests passed");
