import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildDailyBrief, formatProfileDisplayName } from "@/lib/mobile-prototype/build-daily-brief";
import { createTestTimelineResolution } from "@/tests/test-fixtures";

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

function visibleBriefShape(brief: ReturnType<typeof buildDailyBrief>) {
  return {
    lede: brief.lede,
    sections: brief.sections,
    isEmpty: brief.isEmpty,
    consequences: brief.consequences,
  };
}

function visibleParagraphs(brief: ReturnType<typeof buildDailyBrief>) {
  return brief.sections.flatMap((section) => section.paragraphs);
}

function syncEngineEvidenceValues(brief: ReturnType<typeof buildDailyBrief>) {
  if (!brief.syncEngine) return [];

  const lines = brief.syncEngine
    ? [
      brief.syncEngine.primary,
      ...brief.syncEngine.supporting,
      ...brief.syncEngine.rankedLines,
      ...brief.syncEngine.lines.map((line) => line.syncLine),
      ...brief.syncEngine.continuity.recentlySurfaced,
      ...brief.syncEngine.continuity.surfacedToday,
    ]
    : [];

  const lineEvidence = lines.flatMap((line) => [
    ...line.evidence,
    ...line.explanation.evidence,
    ...line.explanation.details.flatMap((detail) => detail.evidence),
  ]);

  return [
    ...lineEvidence,
    ...(brief.syncEngine.arc?.evidence ?? []),
    ...(brief.syncEngine.continuity.dominantTheme?.evidence ?? []),
    ...brief.syncEngine.continuity.signals.flatMap((signal) => signal.evidence),
  ];
}

{
  const brief = buildDailyBrief({
    items: [],
    workSchedule: null,
    reference,
    userName: "Ahmed",
  });

  assert.equal(brief.isEmpty, true);
  assert.match(brief.lede, /still learning your life|Quiet for now/i);
  assert.deepEqual(brief.sections, []);
  assert.equal(brief.syncEngine, undefined);
}

{
  const items = [
    capture({
      id: "rent",
      title: "Rent",
      category: "reminder",
      destinations: ["Finance", "Calendar"],
      dateLabel: "Next Friday",
      timeline: createTestTimelineResolution({
        timelineRole: "deadline",
        deadlineDate: "2026-06-20",
        startDate: "2026-06-20",
        label: "Next Friday",
      }),
      prompt: "rent is due next friday",
    }),
    capture({
      id: "mom",
      title: "Mom's Birthday",
      destinations: ["Family", "Relationships", "Calendar"],
      dateLabel: "In 8 days",
      timeline: createTestTimelineResolution({
        timelineRole: "event",
        kind: "recurring",
        startDate: "2026-06-22",
        recurrence: { frequency: "yearly", month: 5, dayOfMonth: 22 },
        label: "In 8 days",
      }),
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
      timeline: createTestTimelineResolution({
        timelineRole: "log",
        startDate: "2026-06-03",
        label: "11 days ago",
      }),
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

  const noticingSections = brief.sections.filter((section) => section.id === "noticing");
  const thisWeek = noticingSections.find((section) => section.label === "This Week");
  assert.ok(thisWeek, "expected a This Week section");
  assert.doesNotMatch(thisWeek?.paragraphs[0] ?? "", /haven't logged exercise/i);

  const visible = visibleBriefShape(brief);
  assert.match(visible.lede, /Work starts at 11:00 AM/i);
  assert.deepEqual(visible.sections, brief.sections);
  assert.equal(visible.isEmpty, false);

  assert.ok(brief.syncEngine, "expected hidden Sync Engine metadata");
  assert.deepEqual(
    brief.syncEngine.lines.map((line) => line.text),
    visibleParagraphs(brief),
    "metadata should map to every visible paragraph in order",
  );
  assert.deepEqual(
    brief.syncEngine.rankedLines.map((line) => line.text),
    visibleParagraphs(brief),
    "ranked Sync Engine lines should preserve Daily Brief visible order",
  );
  assert.equal(brief.syncEngine.quality.preservesVisibleCopy, true);
  assert.equal(brief.syncEngine.quality.preservesDecisionOrdering, true);
  assert.ok(brief.syncEngine.continuity);

  for (const entry of brief.syncEngine.lines) {
    assert.equal(entry.syncLine.text, entry.text);
    assert.ok(entry.syncLine.intent);
    assert.ok(entry.syncLine.confidence);
    assert.ok(entry.syncLine.reasons.length > 0);
    assert.ok(entry.syncLine.explanation.isExplainable);
    assert.equal(entry.syncLine.quality.preservesVisibleText, true);
  }

  const evidence = syncEngineEvidenceValues(brief);
  assert.equal(
    evidence.some(
      (item) =>
        item.type === "score_breakdown" ||
        /\bid\b/i.test(item.label) ||
        /^(rent|mom|gym)$/i.test(String(item.value)),
    ),
    false,
    "Daily Brief metadata should not expose raw scores or internal ids",
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
      moneyType: "income",
      timeline: createTestTimelineResolution({
        timelineRole: "task",
        kind: "recurring",
        startDate: "2026-06-19",
        recurrence: { frequency: "weekly", days: ["Friday"] },
        label: "Friday",
      }),
    }),
    capture({
      id: "rent",
      title: "Rent",
      category: "reminder",
      destinations: ["Finance", "Calendar"],
      dateLabel: "Next Friday",
      timeline: createTestTimelineResolution({
        timelineRole: "deadline",
        deadlineDate: "2026-06-20",
        startDate: "2026-06-20",
        label: "Next Friday",
      }),
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

  const noticingSections = brief.sections.filter((section) => section.id === "noticing");
  const thisWeek = noticingSections.find((section) => section.label === "This Week");
  assert.ok(thisWeek, "expected coming soon section");
  assert.ok(
    thisWeek.paragraphs.some((line) =>
      /Payday lands Friday|Rent is due Friday/i.test(line),
    ),
    `expected payday or rent in this week, got: ${thisWeek.paragraphs.join(" | ")}`,
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
        timeline: createTestTimelineResolution({
          timelineRole: "event",
          kind: "recurring",
          startDate: "2026-12-14",
          recurrence: { frequency: "yearly", month: 11, dayOfMonth: 14 },
          label: "December 14",
        }),
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
        timeline: createTestTimelineResolution({
          timelineRole: "deadline",
          deadlineDate: "2026-06-15",
          startDate: "2026-06-15",
          label: "Tomorrow",
        }),
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
        timeline: createTestTimelineResolution({
          timelineRole: "event",
          startDate: "2026-06-15",
          label: "Tomorrow",
          tense: "future",
        }),
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
        timeline: createTestTimelineResolution({
          timelineRole: "log",
          startDate: "2026-06-14",
          label: "Today",
          tense: "past",
        }),
      }),
    ],
    workSchedule,
    reference,
  });

  assert.match(brief.lede, /Work starts at 11:00 AM|Quiet for now/i);
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
        timeline: createTestTimelineResolution({
          timelineRole: "event",
          startDate: "2026-06-21",
          label: "Next week",
        }),
      }),
      capture({
        id: "payday",
        title: "Payday",
        category: "expense",
        destinations: ["Finance", "Calendar"],
        moneyType: "income",
        prompt: "i get paid wednesday",
        timeline: createTestTimelineResolution({
          timelineRole: "task",
          kind: "recurring",
          startDate: "2026-06-18",
          recurrence: { frequency: "weekly", days: ["Wednesday"] },
          label: "Wednesday",
        }),
      }),
    ],
    workSchedule,
    reference,
  });

  const allParagraphs = brief.sections.flatMap((section) => section.paragraphs);
  const tomorrowIdx = allParagraphs.findIndex((line) => /Tomorrow is open/i.test(line));
  const paydayIdx = allParagraphs.findIndex((line) => /Payday lands Wednesday/i.test(line));
  const anniversaryIdx = allParagraphs.findIndex((line) => /Anniversary is in/i.test(line));

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
