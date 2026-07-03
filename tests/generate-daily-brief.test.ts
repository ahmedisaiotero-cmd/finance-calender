import assert from "node:assert/strict";
import test from "node:test";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { generateDailyBrief, maxBriefItemsForProfile } from "@/lib/brief/generate-daily-brief";
import { EMPTY_USER_PROFILE } from "@/lib/sync-profile/user-profile";

function capture(
  partial: Partial<CapturedSyncItem> & Pick<CapturedSyncItem, "id" | "title">,
): CapturedSyncItem {
  return {
    category: "money",
    prompt: partial.title,
    destinations: ["Finance", "Calendar"],
    dateLabel: "Friday",
    timeLabel: "",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

test("maxBriefItemsForProfile respects day style", () => {
  assert.equal(maxBriefItemsForProfile({ ...EMPTY_USER_PROFILE, dayStyle: "calm" }), 3);
  assert.equal(maxBriefItemsForProfile({ ...EMPTY_USER_PROFILE, dayStyle: "busy" }), 5);
  assert.equal(maxBriefItemsForProfile(EMPTY_USER_PROFILE), 4);
});

test("generateDailyBrief caps items and adds curious hook for goals", () => {
  const reference = new Date("2026-06-29T09:00:00");

  const brief = generateDailyBrief({
    items: [
      capture({
        id: "rent-1",
        title: "Rent due Friday",
        prompt: "Rent is due Friday",
        moneyType: "expense",
        timeline: {
          kind: "deadline",
          deadlineDate: "2026-07-03",
          startDate: "2026-07-03",
        },
      }),
    ],
    reference,
    profile: {
      ...EMPTY_USER_PROFILE,
      name: "Ahmed",
      onboardingComplete: true,
      dayStyle: "busy",
      workingToward: "building a savings buffer",
      priorities: ["Money"],
      awareness: ["Money"],
    },
  });

  assert.ok(brief.greeting.includes("Ahmed"));
  assert.ok(brief.items.length <= 5);
  assert.ok(brief.curiousHook?.includes("savings buffer"));
});

test("generateDailyBrief stays compassionate when empty", () => {
  const brief = generateDailyBrief({
    items: [],
    profile: {
      ...EMPTY_USER_PROFILE,
      onboardingComplete: true,
      name: "Sam",
    },
  });

  assert.equal(brief.isEmpty, true);
  assert.equal(brief.pulse.state, "connect");
});
