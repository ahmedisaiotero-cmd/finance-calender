import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";

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
    }),
    capture({
      id: "mom",
      title: "Mom's Birthday",
      destinations: ["Family", "Relationships", "Calendar"],
      dateLabel: "In 8 days",
      timeline: {
        timelineRole: "event",
        startDate: "2026-06-22",
        startTime: "19:00",
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
        timelineRole: "event",
        startDate: "2026-06-03",
        startTime: "18:00",
        endTime: "19:00",
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
  assert.ok(brief.sections.some((section) => section.id === "today"));
  assert.ok(brief.sections.some((section) => section.id === "noticing"));

  const today = brief.sections.find((section) => section.id === "today");
  assert.match(today?.paragraphs[0] ?? "", /Work starts at 11:00 AM/i);

  const noticing = brief.sections.find((section) => section.id === "noticing");
  assert.match(noticing?.paragraphs[0] ?? "", /Mom's Birthday|birthday|exercise/i);

  assert.doesNotMatch(brief.lede, /Nothing urgent|mostly open|worth a quick check/i);
  assert.match(brief.lede, /Work starts at 11:00 AM|Mom's Birthday|Rent|exercise|Payday/i);

  const allBody = brief.sections.map((s) => s.paragraphs.join(" ")).join(" ");
  const paydayMatches = allBody.match(/Payday/gi) ?? [];
  assert.ok(
    !brief.lede.match(/Payday/i) || paydayMatches.length === 0,
    "payday should not repeat in body when it is the lede",
  );
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
      timeline: {
        timelineRole: "task",
        startDate: "2026-06-19",
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

  assert.match(brief.lede, /Payday is in 5 days/i);
  const body = brief.sections.map((section) => section.paragraphs.join(" ")).join(" ");
  assert.doesNotMatch(body, /Payday is in 5 days/i);
}

{
  const priorityItems = [
    capture({
      id: "work-today",
      title: "Work",
      category: "workday",
      destinations: ["Work", "Calendar"],
      dateLabel: "Today",
      timeline: {
        timelineRole: "event",
        startDate: "2026-06-14",
        startTime: "11:00",
        label: "Today",
      },
    }),
    capture({
      id: "mom",
      title: "Mom's Birthday",
      destinations: ["Family", "Relationships", "Calendar"],
      dateLabel: "In 8 days",
      timeline: {
        timelineRole: "event",
        startDate: "2026-06-22",
        label: "In 8 days",
      },
    }),
  ];

  const brief = buildDailyBrief({
    items: priorityItems,
    workSchedule,
    reference,
    lifeProfile: {
      name: "Ahmed",
      typicalWeek: "",
      priorities: ["Family"],
      awareness: [],
      comingUp: "",
      onboardingComplete: true,
      updatedAt: reference.toISOString(),
    },
  });

  assert.match(brief.lede, /Mom's Birthday|birthday/i);
}

console.log("build-daily-brief tests passed");
