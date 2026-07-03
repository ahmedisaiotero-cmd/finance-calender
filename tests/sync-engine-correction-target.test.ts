import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import type { SyncEngineConversationTurn } from "@/lib/sync-engine";
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

function appendTurns(
  turns: SyncEngineConversationTurn[],
  text: string,
  result: ReturnType<typeof processSyncMessage>,
): SyncEngineConversationTurn[] {
  return [
    ...turns,
    {
      role: "user",
      text,
      intent: result.conversationIntent.type,
      memoryDecision: result.debug.memoryDecision,
      category: result.debug.category,
      importance: result.debug.importance,
      judgmentPrimary: result.runtime.after.judgment.primary,
      response: result.response,
    },
    {
      role: "sync",
      text: result.response,
      intent: result.conversationIntent.type,
      memoryDecision: result.debug.memoryDecision,
      category: result.debug.category,
      importance: result.debug.importance,
      judgmentPrimary: result.runtime.after.judgment.primary,
      response: result.response,
    },
  ].slice(-24);
}

{
  const first = run("Rent is due Friday.");
  const rentMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(rentMemory);

  const second = run("Actually rent is due Monday now.", [rentMemory]);
  assert.equal(second.correctionTarget.detected, true);
  assert.equal(second.correctionTarget.action, "update_existing");
  assert.equal(second.correctionTarget.targetMemoryId, rentMemory.id);
  assert.equal(second.debug.memoryDecision, "update_existing");
  assert.equal(second.debug.wouldCreateMemory, false);
}

{
  const first = run("I work Sunday through Wednesday.");
  const workMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(workMemory);

  const second = run("Actually I work every Friday now.", [workMemory]);
  assert.equal(second.contradiction.detected, true);
  assert.equal(second.contradiction.type, "schedule");
  assert.ok(
    second.debug.memoryDecision === "ask_follow_up" ||
      second.debug.memoryDecision === "update_existing",
  );
  assert.ok(second.debug.wouldCreateMemory === false);
}

{
  const rent = run("Rent is due Friday.");
  const car = run("Car payment is due Friday.");
  const rentMemory = memoryFromSyncEngineResult(rent, reference);
  const carMemory = memoryFromSyncEngineResult(car, reference);
  assert.ok(rentMemory && carMemory);

  const second = run("Actually it's due Monday.", [rentMemory, carMemory]);
  assert.equal(second.correctionTarget.detected, true);
  assert.equal(second.correctionTarget.action, "ask_follow_up");
  assert.ok(second.correctionTarget.candidateMemoryIds.length >= 2);
  assert.equal(second.debug.memoryDecision, "ask_follow_up");
  assert.match(second.response, /which|what/i);
}

{
  const first = run("Mom's birthday is tomorrow.");
  const birthdayMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(birthdayMemory);

  const second = run("Actually mom's birthday is Saturday.", [birthdayMemory]);
  assert.equal(second.correctionTarget.detected, true);
  assert.equal(second.correctionTarget.action, "update_existing");
  assert.equal(second.correctionTarget.targetMemoryId, birthdayMemory.id);
  assert.equal(second.debug.memoryDecision, "update_existing");
}

{
  const first = run("mom birthday thursday");
  const birthdayMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(birthdayMemory);

  const second = run("actually that was friday", [birthdayMemory]);
  assert.equal(second.correctionTarget.detected, true);
  assert.equal(second.correctionTarget.action, "update_existing");
  assert.equal(second.correctionTarget.targetMemoryId, birthdayMemory.id);
  assert.equal(second.debug.memoryDecision, "update_existing");
}

{
  const first = run("i work tomorrow 11 am");
  const workMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(workMemory);

  const turns = appendTurns([], "i work tomorrow 11 am", first);
  const second = processSyncMessage({
    text: "actual work is at 12 not 11 am",
    reference,
    storedMemories: [workMemory],
    conversation: { turns },
    engineMode: "dryRun",
  });
  assert.equal(second.correctionTarget.detected, true);
  assert.equal(second.correctionTarget.action, "update_existing");
  assert.equal(second.correctionTarget.targetMemoryId, workMemory.id);
  assert.equal(second.debug.memoryDecision, "update_existing");
  assert.doesNotMatch(second.response, /which memory|few memories/i);
}

{
  const first = run("met with sam");
  const personMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(personMemory);

  const turns = appendTurns([], "met with sam", first);
  const second = processSyncMessage({
    text: "actually that was tom not sam",
    reference,
    storedMemories: [personMemory],
    conversation: { turns },
    engineMode: "dryRun",
  });
  assert.equal(second.correctionTarget.detected, true);
  assert.equal(second.correctionTarget.action, "update_existing");
  assert.equal(second.correctionTarget.targetMemoryId, personMemory.id);
  assert.equal(second.debug.memoryDecision, "update_existing");
}

{
  const first = run("i work monday");
  const workMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(workMemory);

  const turns = appendTurns([], "i work monday", first);
  const second = processSyncMessage({
    text: "i do not work monday",
    reference,
    storedMemories: [workMemory],
    conversation: { turns },
    engineMode: "dryRun",
  });
  assert.equal(second.correctionTarget.detected, true);
  assert.equal(second.correctionTarget.action, "update_existing");
  assert.equal(second.debug.memoryDecision, "update_existing");
}

{
  const first = run("i work monday 9 am");
  const workMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(workMemory);

  const turns = appendTurns([], "i work monday 9 am", first);
  const second = processSyncMessage({
    text: "i work monday 9 am actually",
    reference,
    storedMemories: [workMemory],
    conversation: { turns },
    engineMode: "dryRun",
  });
  assert.equal(second.correctionTarget.detected, true);
  assert.equal(second.correctionTarget.action, "update_existing");
  assert.equal(second.debug.memoryDecision, "update_existing");
}

{
  const result = run("Actually that was Friday.");
  assert.equal(result.conversationIntent.type, "correction_request");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.debug.wouldCreateMemory, false);
  assert.equal(result.futureFollowUpDecision.decision, "ask_now");
}

{
  const first = run("My girlfriend hates crowded restaurants.");
  const preferenceMemory = memoryFromSyncEngineResult(first, reference);
  assert.ok(preferenceMemory);

  const second = run("Actually she likes crowded restaurants now.", [preferenceMemory]);
  assert.equal(second.contradiction.detected, true);
  assert.equal(second.contradiction.type, "preference");
  assert.ok(
    second.debug.memoryDecision === "ask_follow_up" ||
      second.debug.memoryDecision === "update_existing",
  );
  assert.equal(second.debug.wouldCreateMemory, false);
}

{
  const first = run("mom birthday thursday");
  const secondSeed = run("dad birthday thursday");
  const mom = memoryFromSyncEngineResult(first, reference);
  const dad = memoryFromSyncEngineResult(secondSeed, reference);
  assert.ok(mom && dad);

  const result = run("that was friday", [mom, dad]);
  assert.equal(result.correctionTarget.detected, true);
  assert.equal(result.correctionTarget.action, "ask_follow_up");
  assert.equal(result.debug.memoryDecision, "ask_follow_up");
}

console.log("sync-engine-correction-target tests passed");
