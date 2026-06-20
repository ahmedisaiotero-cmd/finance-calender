import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { composeCuratedBrief } from "@/lib/intelligence/briefing-composer";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import {
  briefParagraphKey,
  briefSectionKey,
  briefSectionKeysAreUnique,
} from "@/lib/mobile-prototype/brief-render-keys";
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
  const sections = [
    { id: "noticing" as const, label: "Tomorrow", paragraphs: ["Flight at 6:00 AM."] },
    { id: "noticing" as const, label: "This Week", paragraphs: ["Payday lands Thursday."] },
    { id: "noticing" as const, label: "Later", paragraphs: ["Send money Saturday."] },
  ];

  assert.equal(briefSectionKeysAreUnique(sections), true);
  assert.equal(briefSectionKey(sections[0], 0), "noticing-0");
  assert.equal(briefSectionKey(sections[1], 1), "noticing-1");
  assert.equal(
    briefParagraphKey(sections[0], 0, 0),
    "noticing-0-p-0",
  );
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
        id: "send-money",
        title: "Send Money to Mom",
        prompt: "send mama money saturday",
        destinations: ["Family", "Finance"],
        timeline: {
          timelineRole: "event",
          startDate: "2026-06-21",
          label: "Saturday",
        },
      }),
    ],
    workSchedule,
    reference,
  });

  const curated = composeCuratedBrief({
    consequences,
    priorities: ["Family"],
    hasUserContext: true,
    emptyNoContext: BRIEF_EMPTY_NO_CONTEXT,
    emptyQuiet: BRIEF_EMPTY_QUIET,
  });

  assert.ok(curated.sections.length >= 2, "expected multiple time-grouped sections");
  assert.equal(
    curated.sections.every((section) => section.id === "noticing"),
    true,
    "time groups share the noticing id",
  );
  assert.equal(briefSectionKeysAreUnique(curated.sections), true);

  const paragraphKeys = curated.sections.flatMap((section, sectionIndex) =>
    section.paragraphs.map((_, paragraphIndex) =>
      briefParagraphKey(section, sectionIndex, paragraphIndex),
    ),
  );
  assert.equal(
    new Set(paragraphKeys).size,
    paragraphKeys.length,
    "paragraph keys should stay unique across sections",
  );
}

{
  const brief = buildDailyBrief({
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

  assert.equal(briefSectionKeysAreUnique(brief.sections), true);
}

console.log("brief-render-keys tests passed");
