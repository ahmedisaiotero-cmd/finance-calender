import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  decideTodayPriorities,
  isTomorrowSummaryText,
} from "@/lib/intelligence/decision-engine";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { buildSyncTimeBlocksForRange } from "@/lib/sync-time-blocks";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

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

const reference = new Date("2026-06-14T18:00:00");

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function decisionAt(
  items: CapturedSyncItem[],
  options: {
    reference?: Date;
    priorities?: string[];
    maxSupporting?: number;
  } = {},
) {
  const ref = options.reference ?? reference;
  const brief = buildDailyBrief({ items, reference: ref, workSchedule });
  const blocks = buildSyncTimeBlocksForRange({
    items,
    startDate: ref,
    endDate: addDays(ref, 14),
    reference: ref,
    workSchedule,
  });

  return decideTodayPriorities({
    consequences: brief.consequences ?? [],
    items,
    blocks,
    reference: ref,
    workSchedule,
    hasUserContext: items.length > 0,
    maxSupporting: options.maxSupporting,
    priorities: options.priorities,
  });
}

function surfacedLines(decision: ReturnType<typeof decideTodayPriorities>) {
  return [
    decision.primary.text,
    ...decision.supporting.map((candidate) => candidate.text),
  ];
}

function allSurfacedText(decision: ReturnType<typeof decideTodayPriorities>) {
  return surfacedLines(decision).join(" ").toLowerCase();
}

const LIGHT_PATTERN =
  /\b(coffee|mcdonald|chipotle|shower|groceries|dry cleaning|dog food|random note|just thinking|might do something later|email sarah|pick up dry cleaning)\b/i;

const STALE_PATTERN =
  /\b(eleven days ago|last month|three weeks ago|next year|car wash three weeks)\b/i;

const VAGUE_TOMORROW_PATTERN =
  /\b(something important tomorrow|appointment tomorrow|something about family tomorrow|family stuff|something tomorrow)\b/i;

const SPECIFIC_URGENT_PATTERN =
  /\b(flight|daughter|school|payday|workout|rent|team sync|birthday)\b/i;

function buildStressCorpus() {
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  const prompts = [
    // light habits / food / vague
    "coffee this morning",
    "had lunch at chipotle",
    "spent 9 dollars at mcdonalds earlier",
    "i showered today",
    "bought groceries",
    "just thinking about stuff",
    "random note",
    "might do something later",
    "feeling tired",
    "pick up dry cleaning",
    "dog food running low",
    "remember to email sarah",
    // repeated health
    "sleep was rough last night",
    "didn't sleep well",
    "legs sore from yesterday",
    "went for a walk",
    "need to drink more water",
    // emotional
    "i was sad today",
    "stressed again",
    "feeling overwhelmed",
    "rough day emotionally",
    "kinda anxious about things",
    // family
    "take daughter to school tomorrow at 7:30am",
    "mom called today",
    "something about family tomorrow",
    "family stuff",
    // money
    "rent due friday",
    "payday tomorrow at 5am",
    "worried about money",
    "bills piling up",
    "spent too much this week",
    // work
    "sync today from 8pm to 10pm",
    "team sync tomorrow at 2pm",
    "project deadline friday",
    "work has been busy",
    // important timed / tomorrow load
    "i have a flight tomorrow at 6am",
    "dentist appointment next monday",
    "gym class tomorrow at 7am",
    "workout at 8pm",
    "my friend's birthday is tomorrow",
    // duplicate vague + specific tomorrow
    "something important tomorrow",
    "appointment tomorrow",
    // stale / quiet
    "i went to the gym eleven days ago",
    "coffee last month",
    "car wash three weeks ago",
    "vacation planning next year",
    // longer horizon noise
    "call dentist someday",
    "car insurance renews next month",
    "submit taxes by april 15",
    "anniversary next week",
  ];

  const supplemental = [
    "dental cleaning tuesday at 3pm",
    "vet checkup for the dog friday",
    "library books due wednesday",
    "package delivery thursday afternoon",
    "oil change saturday at 9am",
    "haircut next tuesday at 4pm",
    "parent teacher conference next week",
    "renew passport before august",
    "fix leaky kitchen faucet",
    "call insurance about the claim",
    "replace windshield wiper blades",
    "schedule eye exam next month",
  ];

  for (const text of [...prompts, ...supplemental]) {
    captureFromBriefInput(text, ctx, store.handlers);
  }

  assert.ok(
    store.items.length >= 50,
    `expected at least 50 stored memories after dedupe, got ${store.items.length}`,
  );

  return store.items;
}

function assertRankedDescending(decision: ReturnType<typeof decideTodayPriorities>) {
  for (let index = 1; index < decision.rankedCandidates.length; index += 1) {
    assert.ok(
      decision.rankedCandidates[index - 1]!.score >=
        decision.rankedCandidates[index]!.score,
      "rankedCandidates should stay sorted by descending score",
    );
  }
}

function isExplicitLightMemory(item: CapturedSyncItem) {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  return LIGHT_PATTERN.test(text);
}

// 50-memory messy corpus — Today stays capped and specific.
{
  const items = buildStressCorpus();
  assert.ok(items.length >= 50);

  const decision = decisionAt(items);
  const surfaced = surfacedLines(decision);
  const combined = allSurfacedText(decision);

  assert.ok(
    surfaced.length <= 3,
    `expected at most 3 surfaced lines, got ${surfaced.length}: ${surfaced.join(" | ")}`,
  );
  assert.ok(decision.primary.text.length > 0, "primary should be chosen");
  assert.ok(
    decision.supporting.length <= 2,
    `supporting should respect maxSupporting=2, got ${decision.supporting.length}`,
  );
  assertRankedDescending(decision);

  assert.ok(
    !LIGHT_PATTERN.test(decision.primary.text),
    `light memory must not be primary, got: ${decision.primary.text}`,
  );

  for (const line of decision.supporting) {
    assert.ok(
      !LIGHT_PATTERN.test(line.text),
      `light memory must not appear in supporting, got: ${line.text}`,
    );
    assert.ok(
      !STALE_PATTERN.test(line.text),
      `stale memory must not appear in supporting, got: ${line.text}`,
    );
  }

  assert.ok(
    SPECIFIC_URGENT_PATTERN.test(combined),
    `specific timed/today/tomorrow items should surface, got: ${combined}`,
  );

  const vagueSurfaced = surfaced.filter((line) => VAGUE_TOMORROW_PATTERN.test(line));
  assert.ok(
    vagueSurfaced.length <= 1,
    `duplicate vague/specific tomorrow entries should not both dominate, got: ${vagueSurfaced.join(" | ")}`,
  );

  const lightItems = items.filter(isExplicitLightMemory);
  assert.ok(lightItems.length >= 5, "fixture should include multiple light memories");
  for (const item of lightItems) {
    const inRankedTop3 = decision.rankedCandidates
      .slice(0, 3)
      .some(
        (candidate) =>
          candidate.consequence?.sourceMemoryId === item.id ||
          candidate.text.toLowerCase().includes(item.title.toLowerCase()),
      );
    assert.ok(
      !inRankedTop3,
      `explicit light memory should not dominate top 3 ranked candidates: ${item.title}`,
    );
  }
}

// Profile priority lifts family but urgent flight still surfaces.
{
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  for (const text of [
    "take daughter to school tomorrow at 7:30am",
    "i have a flight tomorrow at 6am",
    "payday tomorrow at 5am",
    "coffee this morning",
    "worried about money",
    "something important tomorrow",
  ]) {
    captureFromBriefInput(text, ctx, store.handlers);
  }

  const familyFirst = decisionAt(store.items, { priorities: ["Family"] });
  const combined = allSurfacedText(familyFirst);

  assert.ok(
    /daughter|school|flight|payday/i.test(combined),
    `profile-aware ranking should still surface specific consequences, got: ${combined}`,
  );
  assert.ok(
    !LIGHT_PATTERN.test(familyFirst.primary.text),
    `profile priority must not promote light notes to primary, got: ${familyFirst.primary.text}`,
  );
}

// Tomorrow load present — summary may appear but should not replace all specificity.
{
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference, workSchedule };

  for (const text of [
    "i have a flight tomorrow at 6am",
    "take daughter to school tomorrow at 7:30am",
    "team sync tomorrow at 2pm",
    "gym class tomorrow at 7am",
    "my friend's birthday is tomorrow",
    "workout at 8pm",
  ]) {
    captureFromBriefInput(text, ctx, store.handlers);
  }

  const decision = decisionAt(store.items);
  const combined = allSurfacedText(decision);

  assert.ok(
    SPECIFIC_URGENT_PATTERN.test(combined),
    `busy tomorrow should still leave specific items visible, got: ${combined}`,
  );

  if (isTomorrowSummaryText(decision.primary.text)) {
    assert.ok(
      decision.supporting.some((line) => SPECIFIC_URGENT_PATTERN.test(line.text)),
      "tomorrow summary primary should still leave specific supporting lines",
    );
  }
}

console.log("decision-stress tests passed");
