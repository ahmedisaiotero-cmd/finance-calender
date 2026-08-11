import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import type { SyncEngineConversationTurn, SyncEngineMessageResult } from "@/lib/sync-engine";
import { processSyncMessage } from "@/lib/sync-engine";
import { memoryFromSyncEngineResult } from "@/lib/sync-engine/tools/lab-state";

const reference = new Date("2026-06-27T09:00:00");

function appendTurns(
  turns: SyncEngineConversationTurn[],
  text: string,
  result: SyncEngineMessageResult,
): SyncEngineConversationTurn[] {
  return [
    ...turns,
    {
      role: "user" as const,
      text,
      intent: result.conversationIntent.type,
      memoryDecision: result.debug.memoryDecision,
      category: result.debug.category,
      importance: result.debug.importance,
      judgmentPrimary: result.runtime.after.judgment.primary,
      response: result.response,
    },
    {
      role: "sync" as const,
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
  let turns: SyncEngineConversationTurn[] = [];
  const hungry = processSyncMessage({
    text: "i am hungry",
    reference,
    engineMode: "dryRun",
    conversation: { turns },
  });
  turns = appendTurns(turns, "i am hungry", hungry);

  const work = processSyncMessage({
    text: "i work tomorrow 11 am",
    reference,
    engineMode: "dryRun",
    conversation: { turns },
  });
  turns = appendTurns(turns, "i work tomorrow 11 am", work);
  assert.match(work.response, /\bwork\b/i);
  assert.match(work.response, /\b11\b/i);
  assert.doesNotMatch(work.response, /\bhungry\b/i);

  const wake = processSyncMessage({
    text: "i woke up at 10 am",
    reference,
    engineMode: "dryRun",
    conversation: { turns },
  });
  assert.match(wake.response, /woke|up|10|context/i);
  assert.doesNotMatch(wake.response, /\bhungry\b/i);
  assert.doesNotMatch(wake.response, /am hungry today/i);
}

{
  let turns: SyncEngineConversationTurn[] = [];
  const memories: CapturedSyncItem[] = [];
  const hungry = processSyncMessage({
    text: "i am hungry",
    reference,
    engineMode: "dryRun",
    conversation: { turns },
  });
  turns = appendTurns(turns, "i am hungry", hungry);
  const hungryMemory = memoryFromSyncEngineResult(hungry, reference);
  if (hungryMemory) memories.push(hungryMemory);

  const work = processSyncMessage({
    text: "i work tomorrow 11 am",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
    conversation: { turns },
  });
  turns = appendTurns(turns, "i work tomorrow 11 am", work);
  const workMemory = memoryFromSyncEngineResult(work, reference);
  if (workMemory) memories.unshift(workMemory);

  const brief = processSyncMessage({
    text: "what matters today",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
    conversation: { turns },
  });
  assert.equal(brief.conversationIntent.type, "briefing_request");
  assert.match(brief.response, /work|11|tomorrow/i);
  assert.doesNotMatch(brief.response, /am hungry today/i);
}

{
  const repeatedHungryTurns: SyncEngineConversationTurn[] = [
    {
      role: "user",
      text: "i am hungry",
      category: "workout",
      memoryDecision: "ignore",
      judgmentPrimary: "Am Hungry today.",
    },
    {
      role: "sync",
      text: "Am Hungry today.",
      category: "workout",
      memoryDecision: "ignore",
      judgmentPrimary: "Am Hungry today.",
    },
    {
      role: "user",
      text: "still hungry",
      category: "workout",
      memoryDecision: "ignore",
      judgmentPrimary: "Am Hungry today.",
    },
    {
      role: "sync",
      text: "Am Hungry today.",
      category: "workout",
      memoryDecision: "ignore",
      judgmentPrimary: "Am Hungry today.",
    },
  ];

  const result = processSyncMessage({
    text: "rent is due Friday",
    reference,
    engineMode: "dryRun",
    conversation: { turns: repeatedHungryTurns },
  });
  assert.match(result.response, /rent|friday/i);
  assert.doesNotMatch(result.response, /\bhungry\b/i);
  assert.equal(result.conversationState?.staleJudgmentRisk, true);
  assert.equal(result.conversationGoal?.shouldAvoidStaleJudgment, true);
}

{
  const result = processSyncMessage({
    text: "i am hungry",
    reference,
    engineMode: "dryRun",
  });
  assert.match(result.response, /noted|context/i);
  assert.doesNotMatch(result.response, /priority|urgent|critical/i);
}

{
  const result = processSyncMessage({
    text: "i work tomorrow 11 am",
    reference,
    engineMode: "dryRun",
  });
  assert.match(result.response, /work/i);
  assert.match(result.response, /tomorrow/i);
  assert.match(result.response, /\b11\b/i);
  assert.equal(result.debug.shouldSurfaceLater, true);
  assert.doesNotMatch(result.consequence?.summary ?? "", /few areas of your life/i);
}

{
  const wake = processSyncMessage({
    text: "i woke up at 10 am",
    reference,
    engineMode: "dryRun",
  });
  assert.match(wake.response, /woke|up|10|context/i);
  assert.doesNotMatch(wake.consequence?.summary ?? "", /few areas of your life/i);
}

{
  const brief = processSyncMessage({
    text: "what matters today",
    reference,
    engineMode: "dryRun",
  });
  assert.doesNotMatch(brief.response, /what matters todat|today today/i);
}

{
  const memories: CapturedSyncItem[] = [];
  const paid = processSyncMessage({
    text: "i got paid today",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });
  const paidMemory = memoryFromSyncEngineResult(paid, reference);
  if (paidMemory) memories.unshift(paidMemory);

  const spent = processSyncMessage({
    text: "i spent $500 today",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });
  const spentMemory = memoryFromSyncEngineResult(spent, reference);
  if (spentMemory) memories.unshift(spentMemory);

  const brief = processSyncMessage({
    text: "what matters today",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });

  assert.doesNotMatch(brief.response, /not enough context/i);
  assert.match(brief.response, /pay|spent|\$500|money|budget|finance/i);
}

{
  const memories: CapturedSyncItem[] = [];
  const exhausted = processSyncMessage({
    text: "i feel exhausted",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });
  const exhaustedMemory = memoryFromSyncEngineResult(exhausted, reference);
  if (exhaustedMemory) memories.unshift(exhaustedMemory);

  const workout = processSyncMessage({
    text: "i skipped workout again",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });
  const workoutMemory = memoryFromSyncEngineResult(workout, reference);
  if (workoutMemory) memories.unshift(workoutMemory);

  const brief = processSyncMessage({
    text: "what matters today",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });

  assert.match(brief.response, /health|workout|energy|exhausted|routine/i);
}

{
  const memories: CapturedSyncItem[] = [];
  const anxious = processSyncMessage({
    text: "i feel anxious",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });
  const anxiousMemory = memoryFromSyncEngineResult(anxious, reference);
  if (anxiousMemory) memories.unshift(anxiousMemory);

  const spending = processSyncMessage({
    text: "i am overspending this week",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });
  const spendingMemory = memoryFromSyncEngineResult(spending, reference);
  if (spendingMemory) memories.unshift(spendingMemory);

  const brief = processSyncMessage({
    text: "what matters today",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });

  assert.match(brief.response, /anxious|stress|money|overspend|finance|budget/i);
}

{
  const memories: CapturedSyncItem[] = [];
  const rent = processSyncMessage({
    text: "rent is due friday",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });
  const rentMemory = memoryFromSyncEngineResult(rent, reference);
  if (rentMemory) memories.unshift(rentMemory);

  processSyncMessage({
    text: "i watched a video",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });

  const brief = processSyncMessage({
    text: "what matters today",
    reference,
    engineMode: "dryRun",
    labMemories: memories,
  });

  assert.match(brief.response, /rent|due|friday/i);
  assert.doesNotMatch(brief.response, /video/i);
}

{
  const greeting = processSyncMessage({
    text: "hello",
    reference,
    engineMode: "dryRun",
  });
  assert.equal(greeting.debug.remembered, false);
  assert.equal(greeting.debug.memoryDecision, "ignore");

  const followup = processSyncMessage({
    text: "i work tomorrow 11 am",
    reference,
    engineMode: "dryRun",
    conversation: {
      turns: appendTurns([], "hello", greeting),
    },
  });
  assert.notEqual(followup.debug.memoryDecision, "ignore");
  assert.match(followup.response, /work|11|tomorrow/i);
}

console.log("sync-engine-conversation-state tests passed");
