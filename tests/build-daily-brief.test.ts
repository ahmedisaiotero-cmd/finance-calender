import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildDailyBrief, formatProfileDisplayName } from "@/lib/mobile-prototype/build-daily-brief";

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

function capture(
  partial: Partial<CapturedSyncItem> & Pick<CapturedSyncItem, "id" | "title">,
): CapturedSyncItem {
  return {
    category: "task",
    prompt: partial.title,
    destinations: ["Calendar"],
    dateLabel: "Tomorrow",
    timeLabel: "Flexible",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

{
  const brief = buildDailyBrief({
    items: [],
    workSchedule: null,
    reference,
    userName: "Ahmed",
  });

  assert.equal(brief.isEmpty, true);
  assert.match(brief.lede, /Tell Sync what matters/i);
}

{
  const items = [
    capture({
      id: "rent",
      title: "Rent",
      category: "reminder",
      destinations: ["Finance", "Calendar"],
      dateLabel: "Next Friday",
      timeline: {
        timelineRole: "deadline",
        deadlineDate: "2026-06-20",
        startDate: "2026-06-20",
        label: "Next Friday",
      },
      prompt: "rent is due next friday",
    }),
    capture({
      id: "mom",
      title: "Mom's Birthday",
      destinations: ["Family", "Relationships", "Calendar"],
      dateLabel: "In 8 days",
      timeline: {
        timelineRole: "event",
        kind: "recurring",
        startDate: "2026-06-22",
        recurrence: { frequency: "yearly", month: 5, dayOfMonth: 22 },
        label: "In 8 days",
      },
      meaning: {
        importance: "high",
        meaningLabel: "Family commitment",
        summary: "Important family commitment.",
        protection: {
          eligible: true,
          recommended: true,
          protected: false,
        },
        suggestedActions: [],
      },
    }),
    capture({
      id: "gym",
      title: "Gym",
      category: "workout",
      destinations: ["Health", "Calendar"],
      dateLabel: "11 days ago",
      timeline: {
        timelineRole: "log",
        startDate: "2026-06-03",
        label: "11 days ago",
      },
    }),
  ];

  const brief = buildDailyBrief({
    items,
    workSchedule,
    reference,
    userName: "Ahmed",
  });

  assert.equal(brief.isEmpty, false);
  assert.match(brief.lede, /Work starts at 11:00 AM/i);
  assert.doesNotMatch(brief.lede, /Payday|Mom's Birthday|exercise/i);

  const comingSoon = brief.sections.find((section) => section.id === "noticing");
  assert.equal(comingSoon?.label, "Coming soon");
  assert.doesNotMatch(comingSoon?.paragraphs[0] ?? "", /haven't logged exercise/i);
}

{
  const items = [
    capture({
      id: "payday",
      title: "Payday",
      category: "expense",
      destinations: ["Finance", "Calendar"],
      dateLabel: "Friday",
      prompt: "i get paid friday",
      parsedInput: { moneyType: "income" },
      timeline: {
        timelineRole: "task",
        kind: "recurring",
        startDate: "2026-06-19",
        recurrence: { frequency: "weekly", days: ["Friday"] },
        label: "Friday",
      },
    }),
    capture({
      id: "rent",
      title: "Rent",
      category: "reminder",
      destinations: ["Finance", "Calendar"],
      dateLabel: "Next Friday",
      timeline: {
        timelineRole: "deadline",
        deadlineDate: "2026-06-20",
        startDate: "2026-06-20",
        label: "Next Friday",
      },
      prompt: "rent is due next friday",
    }),
  ];

  const brief = buildDailyBrief({
    items,
    workSchedule,
    reference,
    userName: "Ahmed",
  });

  assert.match(brief.lede, /Work starts at 11:00 AM/i);
  assert.doesNotMatch(brief.lede, /Payday is in 5 days/i);

  const comingSoon = brief.sections.find((section) => section.id === "noticing");
  assert.match(
    comingSoon?.paragraphs[0] ?? "",
    /Payday lands Friday|Rent is due Friday/i,
  );
}

{
  const brief = buildDailyBrief({
    items: [
      capture({
        id: "mom-dec",
        title: "Mom's Birthday",
        destinations: ["Family", "Calendar"],
        prompt: "my mom's birthday is december 14",
        timeline: {
          timelineRole: "event",
          kind: "recurring",
          startDate: "2026-12-14",
          recurrence: { frequency: "yearly", month: 11, dayOfMonth: 14 },
          label: "December 14",
        },
      }),
    ],
    workSchedule,
    reference,
  });

  const body = [brief.lede, ...brief.sections.flatMap((s) => s.paragraphs)].join(" ");
  assert.doesNotMatch(body, /Mom's Birthday|December 14/i);
}

{
  const tomorrowRent = buildDailyBrief({
    items: [
      capture({
        id: "rent-tomorrow",
        title: "Rent",
        category: "reminder",
        destinations: ["Finance", "Calendar"],
        prompt: "rent is due tomorrow",
        timeline: {
          timelineRole: "deadline",
          deadlineDate: "2026-06-15",
          startDate: "2026-06-15",
          label: "Tomorrow",
        },
      }),
    ],
    workSchedule: null,
    reference,
  });

  assert.match(tomorrowRent.lede, /Rent is due tomorrow/i);
}

{
  const brief = buildDailyBrief({
    items: [
      capture({
        id: "day-off",
        title: "Day Off Tomorrow",
        category: "workday",
        destinations: ["Work", "Calendar"],
        prompt: "I don't work tomorrow",
        workAvailability: "off",
        timeline: {
          timelineRole: "event",
          startDate: "2026-06-15",
          label: "Tomorrow",
          tense: "future",
        },
      }),
    ],
    workSchedule,
    reference,
  });

  assert.match(brief.lede, /You're off tomorrow/i);
  assert.doesNotMatch(brief.lede, /Work starts at/i);
}

{
  const brief = buildDailyBrief({
    items: [
      capture({
        id: "shower",
        title: "Shower Logged",
        category: "general",
        destinations: ["Health"],
        prompt: "i showered today",
        timeline: {
          timelineRole: "log",
          startDate: "2026-06-14",
          label: "Today",
          tense: "past",
        },
      }),
    ],
    workSchedule,
    reference,
  });

  assert.match(brief.lede, /Work starts at 11:00 AM|Nothing urgent today/i);
  assert.doesNotMatch(brief.lede, /Shower/i);
}

{
  const brief = buildDailyBrief({
    items: [
      capture({
        id: "anniversary",
        title: "Anniversary",
        destinations: ["Relationships", "Calendar"],
        prompt: "anniversary is next week",
        timeline: {
          timelineRole: "event",
          startDate: "2026-06-21",
          label: "Next week",
        },
      }),
      capture({
        id: "payday",
        title: "Payday",
        category: "expense",
        destinations: ["Finance", "Calendar"],
        parsedInput: { moneyType: "income" },
        prompt: "i get paid wednesday",
        timeline: {
          timelineRole: "task",
          kind: "recurring",
          startDate: "2026-06-18",
          recurrence: { frequency: "weekly", days: ["Wednesday"] },
          label: "Wednesday",
        },
      }),
    ],
    workSchedule,
    reference,
  });

  const comingSoon =
    brief.sections.find((section) => section.id === "noticing")?.paragraphs[0] ??
    "";
  const tomorrowIdx = comingSoon.search(/Tomorrow is open/i);
  const paydayIdx = comingSoon.search(/Payday lands Wednesday/i);
  const anniversaryIdx = comingSoon.search(/Anniversary is in/i);

  if (tomorrowIdx >= 0 && paydayIdx >= 0) {
    assert.ok(tomorrowIdx < paydayIdx, "tomorrow should appear before payday");
  }
  if (paydayIdx >= 0 && anniversaryIdx >= 0) {
    assert.ok(
      paydayIdx < anniversaryIdx,
      "payday should appear before anniversary",
    );
  }
}

assert.equal(formatProfileDisplayName("ahmed"), "Ahmed");
assert.equal(formatProfileDisplayName("AHMED"), "Ahmed");

console.log("build-daily-brief tests passed");
