import assert from "node:assert/strict";

import { processSyncMessage } from "@/lib/sync-engine";
import { memoryFromSyncEngineResult } from "@/lib/sync-engine/tools/lab-state";

const reference = new Date("2026-06-24T12:00:00");

function run(input: string) {
  return processSyncMessage({
    text: input,
    reference,
    engineMode: "dryRun",
  });
}

function assertAsksForClarification(
  input: string,
  expectedMissing: RegExp,
  expectedQuestion: RegExp,
) {
  const result = run(input);
  const memory = memoryFromSyncEngineResult(result, reference);

  assert.equal(result.vagueInput.detected, true, `${input}: vague detected`);
  assert.match(result.vagueInput.missing.join(" "), expectedMissing);
  assert.equal(result.vagueInput.recommendedAction, "ask_follow_up");
  assert.match(result.vagueInput.followUpQuestion ?? "", expectedQuestion);
  assert.equal(result.debug.memoryDecision, "ask_follow_up");
  assert.equal(result.debug.remembered, false);
  assert.equal(result.debug.wouldCreateMemory, false);
  assert.equal(result.debug.wouldUpdateExistingMemory, false);
  assert.equal(memory, null);
  assert.equal(result.debug.shouldSurfaceLater, false);
  assert.equal(result.briefingEffect.changed, false);
  assert.ok(result.debug.confidence <= 0.45);
  assert.match(result.response, expectedQuestion);
}

function assertClearMemory(input: string, expectedText?: RegExp) {
  const result = run(input);

  assert.equal(result.vagueInput.detected, false, `${input}: should not be vague`);
  assert.ok(
    result.debug.memoryDecision === "remember" ||
      result.debug.memoryDecision === "update_existing",
    `${input}: expected remember/update, got ${result.debug.memoryDecision}`,
  );
  assert.equal(result.debug.remembered, true);
  assert.ok(result.debug.confidence >= 0.45);
  if (expectedText) {
    const surfaced = [
      result.runtime.after.judgment.primary,
      ...result.runtime.after.judgment.supporting,
      result.runtime.after.brief.lede,
      ...result.runtime.after.brief.lines,
    ].join(" ");
    assert.match(surfaced, expectedText);
  }
}

assertAsksForClarification(
  "I have an appointment.",
  /object|time/,
  /what appointment|when/i,
);
assertAsksForClarification(
  "That thing got moved.",
  /object|time/,
  /what moved|when/i,
);
assertAsksForClarification(
  "I need to cancel something.",
  /action_target/,
  /what needs canceling/i,
);
assertAsksForClarification(
  "remind me about that later.",
  /object|time/,
  /what should i remind you about|when/i,
);
assertAsksForClarification(
  "something important is happening tomorrow.",
  /object/,
  /what is happening/i,
);
assertAsksForClarification(
  "I’m going somewhere next week.",
  /location/,
  /where are you going/i,
);
assertAsksForClarification(
  "I need to talk to her.",
  /person/,
  /who do you need to talk to/i,
);
assertAsksForClarification(
  "I paid it.",
  /payment_target/,
  /what did you pay/i,
);
assertAsksForClarification(
  "it’s due Friday.",
  /payment_target/,
  /what is due/i,
);

assertClearMemory("I have a dentist appointment Thursday at 3 PM.", /dentist|appointment/i);
assertClearMemory("I need to cancel Uber before Friday.");
assertClearMemory("Rent is due Friday.", /rent|friday/i);
assertClearMemory("I’m going to Phoenix next week for work.", /phoenix|work/i);
assertClearMemory("Dinner with mom moved to Friday.", /dinner|mom|friday/i);

console.log("sync-engine-vague-input tests passed");
