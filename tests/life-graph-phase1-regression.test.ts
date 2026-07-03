import assert from "node:assert/strict";

import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";
import {
  attemptBriefCapture,
  captureFromBriefInput,
} from "@/lib/mobile-prototype/capture-brief-input";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import { processSyncMessage } from "@/lib/sync-engine";
import {
  isSilentCaptureReady,
  prepareCaptureFromText,
} from "@/lib/sync-capture/save-capture";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

import { buildDailyBrief as iosBuildDailyBrief } from "../sync-ios/lib/engine/build-daily-brief";
import { buildTodayView as iosBuildTodayView } from "../sync-ios/lib/engine/build-today-view";
import { attemptBriefCapture as iosAttemptBriefCapture } from "../sync-ios/lib/engine/capture-brief-input";

const reference = new Date("2026-06-14T18:00:00");

const messyInputs = [
  {
    text: "I worked on Sync from 8pm to 10pm",
    title: "Project work",
    destinations: ["Work", "Calendar"],
    importance: "medium",
  },
  {
    text: "I keep delaying cancelling Uber",
    title: "Keep Delaying Cancelling Uber",
    destinations: ["Calendar"],
    importance: "medium",
  },
  {
    text: "I thought about the vending business again",
    title: "Thought About The Vending Business Again",
    destinations: ["Goals", "Calendar"],
    importance: "medium",
  },
  {
    text: "Payday is Friday",
    title: "Payday",
    destinations: ["Finance", "Calendar"],
    importance: "medium",
  },
  {
    text: "Mom's birthday is tomorrow",
    title: "Mom's Birthday",
    destinations: ["Family", "Calendar"],
    importance: "high",
  },
  {
    text: "I spent less this month",
    title: "Small Purchase",
    destinations: ["Finance", "Calendar"],
    importance: "medium",
  },
  {
    text: "I want to buy a Mustang",
    title: "Personal Goal",
    destinations: ["Goals"],
    importance: "low",
  },
  {
    text: "I'm tired but want to keep working on Sync",
    title: "Health Signal",
    destinations: ["Health"],
    importance: "low",
  },
] as const;

function assertDestinations(actual: string[], expected: readonly string[], text: string) {
  assert.deepEqual(
    actual,
    [...expected],
    `expected destinations for "${text}" to stay stable`,
  );
}

{
  const prepared = prepareCaptureFromText("I worked on Sync from 8pm to 10pm", {
    items: [],
    reference,
  });

  assert.ok(prepared, "manual capture preparation should still parse Sync work");
  assert.equal(prepared.title, "Project work");
  assertDestinations(
    prepared.destinations,
    ["Work", "Calendar"],
    "I worked on Sync from 8pm to 10pm",
  );
  assert.equal(prepared.meaning.importance, "medium");
  assert.equal(prepared.meaning.meaningLabel, "Worth keeping in view");
  assert.equal(prepared.plan.timeline?.timelineRole, "log");
  assert.equal(prepared.plan.timeline?.startTime, "20:00");
  assert.equal(prepared.plan.timeline?.endTime, "22:00");
  assert.equal(isSilentCaptureReady(prepared), true);
}

{
  const store = createTestCaptureStore();

  for (const example of messyInputs) {
    const result = captureFromBriefInput(
      example.text,
      { items: store.items, reference },
      store.handlers,
    );

    assert.ok(result, `brief capture should save current behavior for: ${example.text}`);
    assert.equal(result.title, example.title);
    assertDestinations(result.destinations, example.destinations, example.text);
    assert.equal(result.meaning.importance, example.importance);
  }

  assert.equal(store.items.length, messyInputs.length);

  // Current pre-Life-Graph behavior: these are saved as regular memories,
  // not resolved as graph loops, resurfaced projects, or durable beliefs yet.
  const currentWeakSpots = new Map(
    store.items.map((item) => [item.originalPrompt ?? item.prompt, item]),
  );
  assert.equal(
    currentWeakSpots.get("I keep delaying cancelling Uber")?.title,
    "Keep Delaying Cancelling Uber",
  );
  assert.equal(
    currentWeakSpots.get("I thought about the vending business again")?.title,
    "Thought About The Vending Business Again",
  );
  assert.equal(
    currentWeakSpots.get("I want to buy a Mustang")?.meaning?.importance,
    "low",
  );
  assert.equal(
    currentWeakSpots.get("I'm tired but want to keep working on Sync")?.title,
    "Health Signal",
  );

  const duplicate = attemptBriefCapture(
    "Payday is Friday",
    { items: store.items, reference },
    store.handlers,
  );
  assert.equal(duplicate.status, "duplicate");
  if (duplicate.status === "duplicate") {
    assert.equal(duplicate.title, "Payday");
    assert.equal(duplicate.message, "I already have that one.");
  }
  assert.equal(store.items.length, messyInputs.length);

  const consequences = buildAllConsequences({
    items: store.items,
    reference,
    workSchedule: null,
  });
  const consequenceText = consequences.map((consequence) => consequence.surfaceText).join(" | ");

  assert.ok(
    consequences.some((consequence) => consequence.kind === "relationship_moment"),
    `mom birthday should remain a relationship consequence: ${consequenceText}`,
  );
  assert.ok(
    consequences.some((consequence) => consequence.kind === "income"),
    `payday should remain an income consequence: ${consequenceText}`,
  );
  assert.ok(
    consequences.some((consequence) => consequence.kind === "work_start"),
    `timed Sync work currently creates a work_start consequence: ${consequenceText}`,
  );
  assert.match(consequenceText, /Payday lands Friday/i);
  assert.match(consequenceText, /Your mom's birthday is tomorrow/i);
  assert.match(consequenceText, /Project work at 8:00 PM today/i);

  const brief = buildDailyBrief({
    items: store.items,
    reference,
    workSchedule: null,
  });
  const today = buildTodayView({
    brief,
    consequences: brief.consequences ?? [],
    items: store.items,
    reference,
    workSchedule: null,
  });

  assert.match(brief.lede, /mom's birthday is tomorrow/i);
  assert.equal(today.supportingPriorities.length <= 2, true);
  assert.equal(today.syncEngine.quality.preservesDecisionOrdering, true);
  assert.equal(today.syncEngine.quality.preservesVisibleCopy, true);
  assert.equal(today.syncEngine.quality.lineCount <= 3, true);
  assert.equal(today.syncEngine.quality.warnings.length, 0);

  const todayLines = [
    today.primaryPriority.text,
    ...today.supportingPriorities.map((line) => line.text),
    today.futureContext?.text ?? "",
  ].join(" ");

  assert.doesNotMatch(todayLines, /\b(graph|node|edge|dashboard)\b/i);
  assert.doesNotMatch(todayLines, /\byou should\b|\byou need to\b/i);

  // Current pre-Life-Graph behavior: Decision owns Today ordering and may
  // prioritize same-day timed Sync work over tomorrow's birthday.
  assert.match(today.primaryPriority.text, /Sync work starts at 8:00 PM/i);
  assert.ok(
    today.supportingPriorities.some((line) => /vending business/i.test(line.text)),
    "current Today output includes the vending-business note as supporting context",
  );
}

{
  const result = processSyncMessage({
    text: "Mom's birthday is tomorrow",
    reference,
    engineMode: "dryRun",
  });

  assert.equal(result.debug.memoryDecision, "remember");
  assert.equal(result.debug.wouldCreateMemory, true);
  assert.equal(result.runtime.after.judgment.supporting.length <= 2, true);
  assert.equal(typeof result.runtime.judgmentChanged, "boolean");
  assert.equal(typeof result.runtime.briefChanged, "boolean");
  assert.match(
    result.reasoningTrace.find((step) => step.step === "judgment_decision")?.summary ?? "",
    /Today primary/i,
  );
  assert.doesNotMatch(result.response, /\bgraph|node|edge\b/i);
}

{
  assert.equal(iosBuildDailyBrief, buildDailyBrief);
  assert.equal(iosBuildTodayView, buildTodayView);
  assert.equal(iosAttemptBriefCapture, attemptBriefCapture);
}

console.log("life-graph phase 1 regression tests passed");
