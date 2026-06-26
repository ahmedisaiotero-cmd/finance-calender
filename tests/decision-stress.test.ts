import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  decideTodayPriorities,
  isTomorrowSummaryText,
} from "@/lib/intelligence/decision-engine";
import { HOME_QUIET } from "@/lib/mobile-prototype/sync-voice";
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
    hasUserContext?: boolean;
    workSchedule?: typeof workSchedule | null;
  } = {},
) {
  const ref = options.reference ?? reference;
  const schedule =
    options.workSchedule === null ? null : (options.workSchedule ?? workSchedule);
  const brief = buildDailyBrief({ items, reference: ref, workSchedule: schedule });
  const blocks = buildSyncTimeBlocksForRange({
    items,
    startDate: ref,
    endDate: addDays(ref, 14),
    reference: ref,
    workSchedule: schedule,
  });

  return decideTodayPriorities({
    consequences: brief.consequences ?? [],
    items,
    blocks,
    reference: ref,
    workSchedule: schedule,
    hasUserContext: options.hasUserContext ?? items.length > 0,
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
  /\b(coffee|mcdonald|chipotle|shower|groceries|dry cleaning|dog food|random note|just thinking|might do something later|email sarah|pick up dry cleaning|cereal|almonds|iced coffee|takeout|meal prep|scrolled too long|water plants|laundry piling)\b/i;

const STALE_PATTERN =
  /\b(eleven days ago|last month|three weeks ago|next year|car wash three weeks|two weeks ago|journal entry from may|old note about taxes)\b/i;

const VAGUE_TOMORROW_PATTERN =
  /\b(something important tomorrow|appointment tomorrow|something about family tomorrow|family stuff|something tomorrow|daughter school tomorrow morning)\b/i;

const SPECIFIC_URGENT_PATTERN =
  /\b(flight|daughter|school|payday|workout|rent|team sync|birthday|gym class|dentist|permission slip|soccer practice)\b/i;

const QUIET_PATTERN = /today is quiet|nothing needs your attention|tell sync|on your mind/i;

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
    "ate cereal for breakfast",
    "snacked on almonds",
    "bought iced coffee",
    "ordered takeout again",
    "forgot to meal prep",
    "need to figure things out",
    "todo list stuff",
    "not sure yet",
    "maybe later",
    "thought about cleaning",
    "scrolled too long last night",
    "forgot to water plants",
    "laundry piling up",
    // repeated health
    "sleep was rough last night",
    "didn't sleep well",
    "legs sore from yesterday",
    "went for a walk",
    "need to drink more water",
    "headache this morning",
    "allergy flare up",
    "skipped breakfast",
    "took vitamins",
    "back hurts a little",
    // emotional
    "i was sad today",
    "stressed again",
    "feeling overwhelmed",
    "rough day emotionally",
    "kinda anxious about things",
    "anxious again today",
    "hard to focus",
    "feeling off",
    "low energy all day",
    // family / school
    "take daughter to school tomorrow at 7:30am",
    "mom called today",
    "something about family tomorrow",
    "family stuff",
    "son has soccer practice tuesday",
    "daughter needs permission slip signed",
    "pick up kids early friday",
    "school fundraiser next month",
    "grandma birthday next month",
    "parent teacher conference next week",
    // money
    "rent due friday",
    "payday tomorrow at 5am",
    "worried about money",
    "bills piling up",
    "spent too much this week",
    "credit card payment due wednesday",
    "check bank balance",
    "overdraft fee last week",
    "netflix subscription renews",
    // work
    "sync today from 8pm to 10pm",
    "team sync tomorrow at 2pm",
    "project deadline friday",
    "work has been busy",
    "standup meeting monday 9am",
    "client call wednesday 3pm",
    "review pull requests tomorrow",
    "boss asked for update",
    "need pto for july trip",
    // important timed / tomorrow load
    "i have a flight tomorrow at 6am",
    "dentist appointment next monday",
    "gym class tomorrow at 7am",
    "workout at 8pm",
    "my friend's birthday is tomorrow",
    // duplicate vague + specific tomorrow
    "something important tomorrow",
    "appointment tomorrow",
    "take daughter to school tomorrow",
    "daughter school tomorrow morning",
    "payday is tomorrow at 5am",
    // stale / quiet noise
    "i went to the gym eleven days ago",
    "coffee last month",
    "car wash three weeks ago",
    "vacation planning next year",
    "ran five miles two weeks ago",
    "dentist visit last month",
    "fixed the sink last month",
    "old note about taxes",
    "journal entry from may",
    // longer horizon noise
    "call dentist someday",
    "car insurance renews next month",
    "submit taxes by april 15",
    "anniversary next week",
    "concert tickets for august",
    "wedding in september",
    "lease renewal in december",
    "halloween plans",
  ];

  const supplemental = [
    "dental cleaning tuesday at 3pm",
    "vet checkup for the dog friday",
    "library books due wednesday",
    "package delivery thursday afternoon",
    "oil change saturday at 9am",
    "haircut next tuesday at 4pm",
    "renew passport before august",
    "fix leaky kitchen faucet",
    "call insurance about the claim",
    "replace windshield wiper blades",
    "schedule eye exam next month",
    "replace air filter this weekend",
    "return amazon package monday",
    "water heater making noise",
    "schedule chimney sweep",
    "buy birthday gift for cousin",
    "refill prescription thursday",
    "mow the lawn saturday",
    "clean out garage someday",
    "organize closet this weekend",
    "replace phone screen protector",
    "backup photos to cloud",
    "update resume sometime",
    "research new laptop",
    "compare car insurance quotes",
    "plan weekend hike",
    "read book club chapter",
    "practice guitar tonight",
    "watch the game tonight",
    "fold laundry tonight",
    "take out recycling",
    "wash dishes after dinner",
    "stretch before bed",
    "pack gym bag for tomorrow",
    "charge headphones",
    "reply to group chat",
    "check weather for tomorrow",
    "set alarm for early flight",
    "print boarding pass later",
    "confirm hotel reservation",
    "text friend about dinner plans",
    "buy milk on the way home",
    "water the garden",
    "feed the cat",
    "pick up prescription refill",
    "schedule oil change reminder",
    "cancel unused subscription",
    "review monthly budget",
    "move money to savings",
    "pay utility bill online",
    "check mailbox",
  ];

  for (const text of [...prompts, ...supplemental]) {
    captureFromBriefInput(text, ctx, store.handlers);
  }

  assert.ok(
    store.items.length >= 100,
    `expected at least 100 stored memories after dedupe, got ${store.items.length}`,
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

function staleLogItem(
  id: string,
  prompt: string,
  startDate: string,
): CapturedSyncItem {
  return {
    id,
    title: prompt,
    category: "general",
    prompt,
    originalPrompt: prompt,
    destinations: ["Health"],
    dateLabel: "Today",
    timeLabel: "Flexible",
    status: "active",
    createdAt: `${startDate}T12:00:00.000Z`,
    updatedAt: `${startDate}T12:00:00.000Z`,
    timeline: {
      timelineRole: "log",
      startDate,
      label: "Today",
    },
  };
}

function buildQuietStaleItems() {
  return [
    staleLogItem("quiet-coffee", "had coffee last month", "2026-05-01"),
    staleLogItem("quiet-car-wash", "car wash three weeks ago", "2026-05-20"),
    staleLogItem("quiet-gym", "went to the gym eleven days ago", "2026-06-03"),
    staleLogItem("quiet-journal", "journal entry from may", "2026-05-12"),
    staleLogItem("quiet-taxes", "old note about taxes", "2026-04-20"),
    staleLogItem("quiet-thought", "just thinking about stuff", "2026-05-28"),
    staleLogItem("quiet-random", "random note", "2026-05-15"),
    staleLogItem("quiet-later", "might do something later", "2026-05-22"),
    staleLogItem("quiet-laundry", "laundry piling up", "2026-06-01"),
    staleLogItem("quiet-scroll", "scrolled too long last night", "2026-06-13"),
    staleLogItem("quiet-walk", "went for a walk", "2026-06-05"),
    staleLogItem("quiet-water", "need to drink more water", "2026-06-08"),
  ];
}

function isExplicitLightMemory(item: CapturedSyncItem) {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  return LIGHT_PATTERN.test(text);
}

function assertSurfaceCap(decision: ReturnType<typeof decideTodayPriorities>) {
  const surfaced = surfacedLines(decision);
  assert.ok(
    surfaced.length <= 3,
    `expected at most 3 surfaced lines, got ${surfaced.length}: ${surfaced.join(" | ")}`,
  );
  assert.ok(decision.primary.text.length > 0, "primary should be chosen");
  assert.ok(
    decision.supporting.length <= 2,
    `supporting should respect maxSupporting=2, got ${decision.supporting.length}`,
  );
}

function assertNoLightOrStaleSurfaced(
  decision: ReturnType<typeof decideTodayPriorities>,
) {
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
}

// 100-memory messy corpus — Today stays capped and specific.
{
  const items = buildStressCorpus();
  assert.ok(items.length >= 100);

  const decision = decisionAt(items);
  const surfaced = surfacedLines(decision);
  const combined = allSurfacedText(decision);

  assertSurfaceCap(decision);
  assertRankedDescending(decision);
  assertNoLightOrStaleSurfaced(decision);

  assert.ok(
    SPECIFIC_URGENT_PATTERN.test(combined),
    `specific timed/today/tomorrow items should surface, got: ${combined}`,
  );

  const vagueSurfaced = surfaced.filter((line) => VAGUE_TOMORROW_PATTERN.test(line));
  assert.ok(
    vagueSurfaced.length <= 1,
    `duplicate vague/specific tomorrow entries should not both dominate, got: ${vagueSurfaced.join(" | ")}`,
  );

  const flightSurfaced = surfaced.filter((line) => /\bflight\b/i.test(line));
  assert.ok(
    flightSurfaced.length <= 1,
    `duplicate flight captures should not dominate surfaced lines, got: ${flightSurfaced.join(" | ")}`,
  );

  const lightItems = items.filter(isExplicitLightMemory);
  assert.ok(lightItems.length >= 10, "fixture should include multiple light memories");
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
    "random note",
    "family stuff",
  ]) {
    captureFromBriefInput(text, ctx, store.handlers);
  }

  const familyFirst = decisionAt(store.items, { priorities: ["Family"] });
  const moneyFirst = decisionAt(store.items, { priorities: ["Money"] });
  const familyCombined = allSurfacedText(familyFirst);
  const moneyCombined = allSurfacedText(moneyFirst);

  assertSurfaceCap(familyFirst);
  assertNoLightOrStaleSurfaced(familyFirst);

  assert.ok(
    /daughter|school|flight|payday/i.test(familyCombined),
    `profile-aware ranking should still surface specific consequences, got: ${familyCombined}`,
  );
  assert.ok(
    !LIGHT_PATTERN.test(familyFirst.primary.text),
    `profile priority must not promote light notes to primary, got: ${familyFirst.primary.text}`,
  );

  assert.ok(
    /payday|rent|flight|daughter|school/i.test(moneyCombined),
    `money priority should still leave urgent specifics visible, got: ${moneyCombined}`,
  );
  assert.ok(
    !isTomorrowSummaryText(familyFirst.primary.text) ||
      familyFirst.supporting.some((line) => SPECIFIC_URGENT_PATTERN.test(line.text)),
    "family profile must not let generic summary replace all specificity",
  );
}

// Overloaded tomorrow — specific items beat generic summary as primary.
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
    "payday tomorrow at 5am",
    "review pull requests tomorrow",
    "something important tomorrow",
    "appointment tomorrow",
  ]) {
    captureFromBriefInput(text, ctx, store.handlers);
  }

  const decision = decisionAt(store.items);
  const combined = allSurfacedText(decision);

  assertSurfaceCap(decision);
  assert.ok(
    SPECIFIC_URGENT_PATTERN.test(combined),
    `busy tomorrow should still leave specific items visible, got: ${combined}`,
  );
  assert.ok(
    !isTomorrowSummaryText(decision.primary.text),
    `overloaded tomorrow should prefer a specific primary, got: ${decision.primary.text}`,
  );
  assert.ok(
    decision.supporting.some((line) => SPECIFIC_URGENT_PATTERN.test(line.text)),
    `overloaded tomorrow should keep additional specific supporting lines, got: ${combined}`,
  );
}

// Quiet / stale week — only old light logs, no urgent consequences.
{
  const items = buildQuietStaleItems();
  assert.ok(items.length >= 10, "quiet fixture should retain stored memories");

  const decision = decisionAt(items, { workSchedule: null });
  const combined = allSurfacedText(decision);

  assertSurfaceCap(decision);
  assert.ok(
    decision.isQuiet || QUIET_PATTERN.test(decision.primary.text),
    `stale-only week should stay quiet or invite capture, got primary: ${decision.primary.text}`,
  );
  assert.ok(
    !SPECIFIC_URGENT_PATTERN.test(combined),
    `stale-only week should not surface urgent timed items, got: ${combined}`,
  );
  assert.ok(
    !LIGHT_PATTERN.test(decision.primary.text),
    `even in quiet week, light notes should not become primary, got: ${decision.primary.text}`,
  );
  assert.ok(
    decision.primary.text === HOME_QUIET ||
      QUIET_PATTERN.test(decision.primary.text),
    `stale week should not invent a busy tomorrow headline, got: ${decision.primary.text}`,
  );
}

console.log("decision-stress tests passed");
