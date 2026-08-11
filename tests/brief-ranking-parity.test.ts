import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { rankBriefConsequences } from "@/lib/intelligence/decision-engine";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
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

/** Pre-migration reference sort — kept in tests only for parity verification. */
function legacyBriefProfileSortBoost(
  consequence: SyncConsequence,
  priorities: string[],
): number {
  if (priorities.length === 0) return 0;
  const text = consequence.surfaceText.toLowerCase();
  let boost = 0;

  if (
    priorities.includes("Family") &&
    /\b(daughter|son|school|mom|dad|family|birthday)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Relationships") &&
    /\b(friend|girlfriend|boyfriend|partner|anniversary|birthday)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Money") &&
    /\b(payday|rent|bill|due|finance)\b/.test(text)
  ) {
    boost -= 6;
  }
  if (
    priorities.includes("Work") &&
    /\b(work|shift|flight|off tomorrow)\b/.test(text)
  ) {
    boost -= 4;
  }
  if (
    priorities.includes("Health") &&
    /\b(gym|workout|doctor|health)\b/.test(text)
  ) {
    boost -= 4;
  }

  return boost;
}

function legacySortBriefConsequences(
  consequences: SyncConsequence[],
  priorities: string[],
): SyncConsequence[] {
  return [...consequences].sort((a, b) => {
    const profileA = legacyBriefProfileSortBoost(a, priorities);
    const profileB = legacyBriefProfileSortBoost(b, priorities);
    const dayA = a.daysUntil ?? 99;
    const dayB = b.daysUntil ?? 99;
    if (dayA !== dayB) return dayA - dayB;
    if (a.dateKey && b.dateKey && a.dateKey !== b.dateKey) {
      return a.dateKey.localeCompare(b.dateKey);
    }
    const minuteA = a.sortMinutes ?? 24 * 60;
    const minuteB = b.sortMinutes ?? 24 * 60;
    if (minuteA !== minuteB) return minuteA - minuteB;
    const priorityA = a.priority + profileA;
    const priorityB = b.priority + profileB;
    return priorityA - priorityB;
  });
}

function isVagueConsequence(text: string) {
  const normalized = text.toLowerCase();
  return (
    /worth a (quick )?check/.test(normalized) ||
    /worth a spot/.test(normalized) ||
    /worth noticing/.test(normalized) ||
    /haven't logged exercise/.test(normalized) ||
    /exercise in \d+ days/.test(normalized)
  );
}

function isNoiseConsequence(consequence: SyncConsequence) {
  const text = consequence.surfaceText.toLowerCase();
  if (consequence.kind === "ambient" || consequence.kind === "health_log") {
    return true;
  }
  if (consequence.kind === "day_synthesis") return true;
  if (/early flight tomorrow — tonight/.test(text)) return true;
  if (/affects your morning availability/.test(text)) return true;
  if (/tomorrow stays open unless/.test(text)) return true;
  if (/finance deadline within the week/.test(text)) return true;
  if (/evening opens|open after/.test(text)) return true;
  if (/you work the next/.test(text)) return true;
  if (/tomorrow is open after/.test(text)) return true;
  if (isVagueConsequence(text)) return true;
  return false;
}

function timeGroupForConsequence(consequence: SyncConsequence) {
  const days = consequence.daysUntil;
  if (days == null || days < 0) return null;
  if (days === 0) return null;
  if (days === 1) return "tomorrow";
  if (days <= 7) return "this_week";
  return "later";
}

function briefEligiblePool(consequences: SyncConsequence[]) {
  return consequences.filter(
    (consequence) =>
      consequence.briefEligible &&
      consequence.horizon === "coming_soon" &&
      !isNoiseConsequence(consequence) &&
      timeGroupForConsequence(consequence) != null,
  );
}

function assertRankParity(
  consequences: SyncConsequence[],
  priorities: string[],
  label: string,
) {
  const pool = briefEligiblePool(consequences);
  const legacyIds = legacySortBriefConsequences(pool, priorities).map(
    (consequence) => consequence.id,
  );
  const rankedIds = rankBriefConsequences({ consequences: pool, priorities })
    .map((candidate) => candidate.consequence?.id)
    .filter((id): id is string => id != null);

  assert.deepEqual(
    rankedIds,
    legacyIds,
    `${label}: rankBriefConsequences order should match legacy brief sort`,
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
        timeline: createTestTimelineResolution({
          timelineRole: "event",
          startDate: "2026-06-15",
          startTime: "06:00",
          isTimed: true,
          label: "Tomorrow",
        }),
      }),
      timedItem({
        id: "school",
        title: "School drop-off",
        prompt: "Take daughter to school tomorrow at 7:30 AM",
        originalPrompt: "Take daughter to school tomorrow at 7:30 AM",
        destinations: ["Family", "School", "Calendar"],
        timeline: createTestTimelineResolution({
          timelineRole: "event",
          startDate: "2026-06-15",
          startTime: "07:30",
          isTimed: true,
          label: "Tomorrow",
        }),
      }),
      timedItem({
        id: "birthday",
        title: "Friend's Birthday",
        prompt: "My friend's birthday is tomorrow",
        originalPrompt: "My friend's birthday is tomorrow",
        destinations: ["Relationships", "Calendar"],
        timeline: createTestTimelineResolution({
          timelineRole: "event",
          startDate: "2026-06-15",
          label: "Tomorrow",
        }),
      }),
    ],
    workSchedule,
    reference,
  });

  assertRankParity(consequences, ["Family"], "busy tomorrow");
}

{
  const consequences = buildAllConsequences({
    items: [
      timedItem({
        id: "payday",
        title: "Payday",
        prompt: "Payday Thursday",
        destinations: ["Finance", "Calendar"],
        moneyType: "income",
        timeline: createTestTimelineResolution({
          timelineRole: "task",
          kind: "recurring",
          startDate: "2026-06-19",
          recurrence: { frequency: "weekly", days: ["Thursday"] },
          label: "Thursday",
        }),
      }),
      timedItem({
        id: "rent",
        title: "Rent",
        prompt: "rent is due friday",
        category: "reminder",
        destinations: ["Finance", "Calendar"],
        timeline: createTestTimelineResolution({
          timelineRole: "deadline",
          deadlineDate: "2026-06-20",
          startDate: "2026-06-20",
          label: "Friday",
        }),
      }),
    ],
    workSchedule,
    reference,
  });

  assertRankParity(consequences, ["Money"], "money priority");
}

{
  const consequences = buildAllConsequences({
    items: [
      timedItem({
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
      timedItem({
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

  assertRankParity(consequences, [], "mixed week");
}

console.log("brief-ranking-parity tests passed");
