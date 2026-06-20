import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildMemoryDetail,
  formatMemoryAppears,
  itemMentionedInBrief,
  memoryHasCalendarImpact,
  memoryPrimaryCategory,
} from "@/lib/mobile-prototype/build-memory-detail";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";

const reference = new Date("2026-06-14T18:00:00");

const momsBirthday: CapturedSyncItem = {
  id: "mom-birthday",
  title: "Mom's Birthday",
  category: "task",
  prompt: "Mom's birthday is June 22",
  destinations: ["Family", "Calendar"],
  dateLabel: "June 22",
  timeLabel: "Flexible",
  timeline: {
    timelineRole: "event",
    kind: "recurring",
    startDate: "2026-06-22",
    recurrence: { frequency: "yearly", month: 5, dayOfMonth: 22 },
    label: "June 22",
  },
  meaning: {
    importance: "high",
    meaningLabel: "Family commitment",
    summary: "Important family date on the horizon.",
    protection: {
      eligible: true,
      recommended: true,
      protected: false,
    },
    suggestedActions: [],
  },
  status: "active",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const giftReminder: CapturedSyncItem = {
  id: "gift",
  title: "Gift reminder",
  category: "reminder",
  prompt: "Buy Mom a gift before June 22",
  destinations: ["Family", "Calendar"],
  dateLabel: "June 20",
  timeLabel: "Flexible",
  timeline: {
    timelineRole: "deadline",
    deadlineDate: "2026-06-20",
    startDate: "2026-06-20",
    label: "June 20",
  },
  status: "active",
  createdAt: "2026-06-02T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
};

const dinnerReservation: CapturedSyncItem = {
  id: "dinner",
  title: "Dinner reservation",
  category: "task",
  prompt: "Dinner reservation for Mom's birthday",
  destinations: ["Family", "Calendar"],
  dateLabel: "June 22",
  timeLabel: "7:00 PM",
  timeline: {
    timelineRole: "event",
    startDate: "2026-06-22",
    startTime: "19:00",
    label: "June 22",
    isTimed: true,
  },
  status: "active",
  createdAt: "2026-06-03T00:00:00.000Z",
  updatedAt: "2026-06-03T00:00:00.000Z",
};

const items = [momsBirthday, giftReminder, dinnerReservation];

assert.equal(memoryPrimaryCategory(momsBirthday), "Family");
assert.equal(formatMemoryAppears(momsBirthday, reference), "June 22");
assert.equal(memoryHasCalendarImpact(momsBirthday), true);

const brief = buildDailyBrief({
  items,
  workSchedule: null,
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

assert.equal(itemMentionedInBrief(momsBirthday, brief, reference), false);

const detail = buildMemoryDetail(momsBirthday, items, { reference, brief });

assert.equal(detail.title, "Mom's Birthday");
assert.match(detail.whyRemembered, /matters to your family and should surface near June 22/i);
assert.equal(detail.category, "Family");
assert.equal(detail.mentionedInBrief, false);
assert.equal(detail.calendarImpact, true);
assert.equal(detail.briefEligible, true);
assert.equal(detail.recurrence, "Every year");
assert.ok(detail.nextOccurrence);
assert.ok(detail.originalInput);
assert.ok(detail.relatedMemories.length >= 1);
assert.ok(
  detail.relatedMemories.some((memory) =>
    /gift|dinner/i.test(memory.title),
  ),
);
assert.ok(
  detail.relatedMemories.every((memory) => memory.id.length > 0),
  "related memories should include stable ids",
);

console.log("build-memory-detail tests passed");
