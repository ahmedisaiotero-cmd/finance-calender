import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  buildLifeObservation,
  DEFAULT_OBSERVATION_MIN_EVIDENCE,
  isValidObservationCopy,
} from "@/lib/mobile-prototype/build-life-observation";
import { buildHomePriorities } from "@/lib/mobile-prototype/build-home-priorities";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  OBSERVATION_COFFEE_ROUTINE,
  OBSERVATION_FAMILY_RECENT,
  OBSERVATION_HEALTH_RECENT,
  OBSERVATION_MONEY_THEME,
  OBSERVATION_QUIET_WEEK,
  OBSERVATION_RELATIONSHIPS_RECENT,
  OBSERVATION_WORK_WEEK,
} from "@/lib/mobile-prototype/sync-voice";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

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

const BANNED = [
  /productive/i,
  /great work/i,
  /great job/i,
  /should exercise/i,
  /too much/i,
  /stay on track/i,
  /keep going/i,
  /crush your goals/i,
  /streak/i,
  /\d+%/,
  /frequency increased/i,
  /elevated/i,
];

function makeMemory(
  partial: {
    prompt: string;
    title?: string;
    category?: CapturedSyncItem["category"];
    destinations?: CapturedSyncItem["destinations"];
    daysAgo: number;
  },
): CapturedSyncItem {
  const stamp = new Date(reference);
  stamp.setDate(stamp.getDate() - partial.daysAgo);
  const iso = stamp.toISOString();

  return {
    id: randomUUID(),
    title: partial.title ?? "Memory",
    category: partial.category ?? "task",
    prompt: partial.prompt,
    originalPrompt: partial.prompt,
    destinations: partial.destinations ?? ["Calendar"],
    dateLabel: "Today",
    timeLabel: "Flexible",
    status: "active",
    createdAt: iso,
    updatedAt: iso,
  };
}

function seedMemories(entries: Array<Parameters<typeof makeMemory>[0]>) {
  return entries.map((entry) => makeMemory(entry));
}

function observe(items: ReturnType<typeof createTestCaptureStore>["items"]) {
  return buildLifeObservation({ items, reference });
}

function assertObservation(
  result: ReturnType<typeof observe>,
  expectedText: string,
  category: string,
) {
  assert.equal(result.text, expectedText);
  assert.equal(result.category, category);
  assert.ok(result.sourceIds.length >= DEFAULT_OBSERVATION_MIN_EVIDENCE);
  assert.ok(result.confidence >= 0.5);
  assert.ok(isValidObservationCopy(result.text ?? ""));
  for (const pattern of BANNED) {
    assert.ok(!pattern.test(result.text ?? ""), `banned copy: ${result.text}`);
  }
}

{
  const items = seedMemories([
    { prompt: "worked on sync today", category: "task", destinations: ["Work"], daysAgo: 0 },
    { prompt: "worked on sync yesterday", category: "task", destinations: ["Work"], daysAgo: 1 },
    { prompt: "worked on project today", category: "task", destinations: ["Work"], daysAgo: 2 },
    { prompt: "coded today", category: "task", destinations: ["Work"], daysAgo: 3 },
    { prompt: "worked today on sync", category: "workday", destinations: ["Work"], daysAgo: 4 },
  ]);
  assertObservation(observe(items), OBSERVATION_WORK_WEEK, "work");
}

{
  const items = seedMemories([
    { prompt: "workout at 8pm", category: "workout", destinations: ["Health"], daysAgo: 0 },
    { prompt: "gym session at 7pm", category: "workout", destinations: ["Health"], daysAgo: 1 },
    { prompt: "morning run today", category: "workout", destinations: ["Health"], daysAgo: 2 },
    { prompt: "cardio tonight", category: "workout", destinations: ["Health"], daysAgo: 3 },
  ]);
  assertObservation(observe(items), OBSERVATION_HEALTH_RECENT, "health");
}

{
  const items = seedMemories([
    { prompt: "payday thursday", category: "expense", destinations: ["Finance"], daysAgo: 0 },
    { prompt: "rent due friday", category: "reminder", destinations: ["Finance"], daysAgo: 1 },
    { prompt: "saved 200 dollars", category: "savings-goal", destinations: ["Finance"], daysAgo: 2 },
    { prompt: "spent 40 at store", category: "expense", destinations: ["Finance"], daysAgo: 3 },
  ]);
  assertObservation(observe(items), OBSERVATION_MONEY_THEME, "money");
}

{
  const items = seedMemories([
    { prompt: "take daughter to school tomorrow", destinations: ["Family"], daysAgo: 0 },
    { prompt: "call mom tonight", destinations: ["Family"], daysAgo: 1 },
    { prompt: "pick up son from school tomorrow", destinations: ["Family"], daysAgo: 2 },
  ]);
  assertObservation(observe(items), OBSERVATION_FAMILY_RECENT, "family");
}

{
  const items = seedMemories([
    { prompt: "friend birthday tomorrow", category: "date-night", destinations: ["Relationships"], daysAgo: 0 },
    { prompt: "anniversary next week", category: "date-night", destinations: ["Relationships"], daysAgo: 1 },
    { prompt: "dinner with girlfriend friday", category: "date-night", destinations: ["Relationships"], daysAgo: 2 },
  ]);
  assertObservation(observe(items), OBSERVATION_RELATIONSHIPS_RECENT, "relationships");
}

{
  const items = seedMemories([
    { prompt: "coffee this morning", category: "general", daysAgo: 0 },
    { prompt: "had coffee today", category: "general", daysAgo: 1 },
    { prompt: "coffee this morning", category: "general", daysAgo: 2 },
    { prompt: "coffee today", category: "general", daysAgo: 3 },
  ]);
  assertObservation(observe(items), OBSERVATION_COFFEE_ROUTINE, "routine");
}

{
  const items = seedMemories([
    { prompt: "coffee this morning", category: "general", daysAgo: 0 },
    { prompt: "showered today", category: "general", daysAgo: 1 },
    { prompt: "spent 5 dollars at mcdonalds", category: "expense", daysAgo: 2 },
  ]);
  const result = observe(items);
  assert.equal(result.text, OBSERVATION_QUIET_WEEK);
  assert.equal(result.category, "general");
}

{
  const items = seedMemories([
    { prompt: "coffee this morning", category: "general", daysAgo: 0 },
    { prompt: "coffee today", category: "general", daysAgo: 1 },
  ]);
  const result = observe(items);
  assert.equal(result.text, null);
  assert.equal(result.sourceIds.length, 0);
  assert.equal(result.confidence, 0);
}

{
  const items = seedMemories([
    { prompt: "worked on sync today", category: "task", destinations: ["Work"], daysAgo: 0 },
    { prompt: "worked on sync yesterday", category: "task", destinations: ["Work"], daysAgo: 1 },
    { prompt: "worked on project today", category: "task", destinations: ["Work"], daysAgo: 2 },
    { prompt: "coded today", category: "task", destinations: ["Work"], daysAgo: 3 },
    { prompt: "worked today on sync", category: "workday", destinations: ["Work"], daysAgo: 4 },
  ]);
  const brief = buildDailyBrief({ items, reference, workSchedule });
  const home = buildHomePriorities({
    consequences: brief.consequences ?? [],
    items,
    reference,
    workSchedule,
    hasUserContext: true,
  });
  assert.equal(home.reflection?.text, OBSERVATION_WORK_WEEK);
}

console.log("life-observation tests passed");
