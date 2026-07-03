import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { processSyncMessage } from "@/lib/sync-engine";
import { memoryFromSyncEngineResult } from "@/lib/sync-engine/tools/lab-state";

const reference = new Date("2026-06-24T12:00:00");

function run(text: string, items: CapturedSyncItem[] = []) {
  return processSyncMessage({
    text,
    reference,
    storedMemories: items,
    engineMode: "dryRun",
  });
}

{
  const result = run("I saw a red car.");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.doesNotMatch(result.runtime.after.judgment.primary, /red car/i);
  assert.notEqual(result.briefingEffect.priorityImpact, "high");
}

{
  const rent = run("Rent is due Friday.");
  const rentMemory = memoryFromSyncEngineResult(rent, reference);
  assert.ok(rentMemory, "rent should create memory");

  const trivial = run("I saw a red car.", [rentMemory]);
  assert.equal(trivial.debug.memoryDecision, "ignore");
  assert.match(
    trivial.runtime.after.judgment.primary,
    /rent|friday|due/i,
    `rent should outrank red car, got ${trivial.runtime.after.judgment.primary}`,
  );
}

{
  const birthday = run("Mom's birthday is tomorrow.");
  const birthdayMemory = memoryFromSyncEngineResult(birthday, reference);
  assert.ok(birthdayMemory, "birthday should create memory");

  const trivial = run("I ate cereal.", [birthdayMemory]);
  assert.equal(trivial.debug.memoryDecision, "ignore");
  assert.doesNotMatch(
    trivial.runtime.after.judgment.primary,
    /cereal/i,
    `cereal should not become primary, got ${trivial.runtime.after.judgment.primary}`,
  );
  const surfaced = [
    trivial.runtime.after.judgment.primary,
    ...trivial.runtime.after.judgment.supporting,
    trivial.runtime.after.brief.lede,
    ...trivial.runtime.after.brief.lines,
  ].join(" ");
  assert.ok(
    /birthday|mom|tomorrow/i.test(surfaced) ||
      /nothing needs your attention/i.test(trivial.runtime.after.judgment.primary),
    `birthday context should outrank cereal or stay quiet, got ${surfaced}`,
  );
}

{
  const work = run("i work tomorrow 11 am");
  const workMemory = memoryFromSyncEngineResult(work, reference);
  assert.ok(workMemory, "work should create memory");

  const hungry = run("i am hungry", [workMemory]);
  assert.doesNotMatch(
    hungry.runtime.after.judgment.primary,
    /am hungry today/i,
    `hunger should not dominate work context, got ${hungry.runtime.after.judgment.primary}`,
  );
  assert.match(
    hungry.runtime.after.judgment.primary,
    /work|11|tomorrow/i,
    `work should remain primary, got ${hungry.runtime.after.judgment.primary}`,
  );
}

{
  const work = run("i work tomorrow 11 am");
  const workMemory = memoryFromSyncEngineResult(work, reference);
  assert.ok(workMemory, "work should create memory");

  const wake = run("i woke up at 10 am", [workMemory]);
  assert.doesNotMatch(
    wake.runtime.after.judgment.primary,
    /woke|10 am/i,
    `wake-up context should not outrank work, got ${wake.runtime.after.judgment.primary}`,
  );
  assert.match(
    wake.runtime.after.judgment.primary,
    /work|11|tomorrow/i,
    `work should remain primary over wake-up context, got ${wake.runtime.after.judgment.primary}`,
  );
}

{
  const result = run("Mom loves orchids.");
  assert.ok(["remember", "update_existing"].includes(result.debug.memoryDecision));
  assert.ok(
    (result.prepared?.destinations ?? []).some((d) => /family|relationships/i.test(d)),
    `expected family/relationship destination, got ${(result.prepared?.destinations ?? []).join(", ")}`,
  );
  assert.doesNotMatch(result.runtime.after.judgment.primary, /orchid/i);
}

{
  const result = run("My girlfriend hates crowded restaurants.");
  assert.ok(["remember", "update_existing"].includes(result.debug.memoryDecision));
  assert.ok(
    (result.prepared?.destinations ?? []).some((d) => /family|relationships/i.test(d)),
    `expected relationship destination, got ${(result.prepared?.destinations ?? []).join(", ")}`,
  );
  assert.doesNotMatch(result.runtime.after.judgment.primary, /crowded restaurants/i);
}

{
  const first = run("I work Sunday through Wednesday.");
  const memory = memoryFromSyncEngineResult(first, reference);
  assert.ok(memory);

  const second = run("I work every Friday now.", [memory]);
  assert.equal(second.contradiction.detected, true);
  assert.equal(second.contradiction.type, "schedule");
  assert.ok(
    second.debug.memoryDecision === "ask_follow_up" ||
      second.debug.memoryDecision === "update_existing",
  );
  assert.ok(second.debug.confidence <= 0.7);
}

{
  const first = run("Rent is due Friday.");
  const memory = memoryFromSyncEngineResult(first, reference);
  assert.ok(memory);

  const second = run("Rent is due Monday now.", [memory]);
  assert.equal(second.contradiction.detected, true);
  assert.equal(second.contradiction.type, "date");
  assert.equal(second.debug.memoryDecision, "update_existing");
  assert.ok(second.debug.confidence <= 0.7);
}

{
  const memory: CapturedSyncItem = {
    id: "pref-vegetarian",
    title: "Diet preference",
    category: "general",
    prompt: "I'm vegetarian.",
    originalPrompt: "I'm vegetarian.",
    destinations: ["Health"],
    dateLabel: "No date",
    timeLabel: "Flexible",
    status: "active",
    createdAt: "2026-06-20T12:00:00.000Z",
    updatedAt: "2026-06-20T12:00:00.000Z",
  };

  const second = run("I love steak.", [memory]);
  assert.equal(second.contradiction.detected, true);
  assert.equal(second.contradiction.type, "preference");
  assert.ok(
    second.debug.memoryDecision === "ask_follow_up" ||
      second.debug.memoryDecision === "update_existing",
  );
  assert.ok(second.debug.confidence <= 0.7);
}

{
  const result = run("i feel overwhelmed");
  assert.match(result.response, /emotional|context|noted|support/i);
  assert.doesNotMatch(result.response, /progress on a goal/i);
  assert.doesNotMatch(result.consequence?.summary ?? "", /progress on a goal/i);
}

{
  const result = run("i am stressed");
  assert.match(result.response, /emotional|context|noted|support/i);
  assert.doesNotMatch(result.response, /progress on a goal/i);
}

{
  const result = run("i feel anxious");
  assert.match(result.response, /emotional|context|noted|support/i);
  assert.doesNotMatch(result.response, /progress on a goal/i);
}

{
  const result = run("i feel exhausted");
  assert.match(result.response, /emotional|context|noted|support/i);
  assert.doesNotMatch(result.response, /progress on a goal/i);
}

{
  const result = run("i have chest pain");
  assert.equal(
    result.response,
    "That could be important. If this feels severe, sudden, or unusual, get medical help.",
  );
  assert.equal(result.debug.wouldCreateMemory, false);
}

{
  const result = run("my chest hurts");
  assert.equal(
    result.response,
    "That could be important. If this feels severe, sudden, or unusual, get medical help.",
  );
  assert.equal(result.debug.wouldCreateMemory, false);
}

{
  const result = run("i feel dizzy");
  assert.equal(
    result.response,
    "That could be important. If this feels severe, sudden, or unusual, get medical help.",
  );
  assert.equal(result.debug.wouldCreateMemory, false);
}

{
  const result = run("brushed teeth");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.debug.wouldCreateMemory, false);
}

{
  const result = run("drank coffee");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.debug.wouldCreateMemory, false);
}

{
  const result = run("watched a video");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.debug.wouldCreateMemory, false);
}

{
  const result = run("canceled Netflix");
  assert.ok(
    result.debug.memoryDecision === "remember" ||
      result.debug.memoryDecision === "update_existing",
    `expected meaningful cancellation to be remembered, got ${result.debug.memoryDecision}`,
  );
  assert.equal(result.debug.wouldCreateMemory || result.debug.wouldUpdateExistingMemory, true);
}

console.log("sync-engine-judgment-ranking tests passed");
