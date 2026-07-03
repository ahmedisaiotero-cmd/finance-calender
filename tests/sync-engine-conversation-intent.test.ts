import assert from "node:assert/strict";

import { processSyncMessage } from "@/lib/sync-engine";
import { memoryFromSyncEngineResult } from "@/lib/sync-engine/tools/lab-state";

const reference = new Date("2026-06-24T12:00:00");

function run(
  text: string,
  options?: { storedMemories?: ReturnType<typeof memoryFromSyncEngineResult>[] },
) {
  return processSyncMessage({
    text,
    reference,
    engineMode: "dryRun",
    storedMemories: options?.storedMemories?.filter(Boolean) as never,
  });
}

function usefulNextActionPattern() {
  return /tell me|what matters|what changed|drop what|ask what|what happened|what's going on/i;
}

{
  const result = run("hello");
  assert.equal(result.conversationIntent.type, "greeting");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.debug.remembered, false);
  assert.match(result.response, usefulNextActionPattern());
  assert.match(result.response, /tell me what changed|what matters today/i);
}

{
  const result = run("hey sync");
  assert.equal(result.conversationIntent.type, "greeting");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.debug.remembered, false);
  assert.match(result.response, usefulNextActionPattern());
  assert.match(result.response, /drop what happened|help place/i);
}

{
  const emptyBriefing = run("what matters today?");
  assert.equal(emptyBriefing.conversationIntent.type, "briefing_request");
  assert.equal(emptyBriefing.debug.memoryDecision, "ignore");
  assert.equal(emptyBriefing.debug.remembered, false);
  assert.match(emptyBriefing.response, /not enough context|tell me what changed/i);

  const rentCapture = run("rent is due Friday");
  const stored = memoryFromSyncEngineResult(rentCapture, reference);
  const withContext = run("what matters today?", {
    storedMemories: stored ? [stored] : [],
  });
  assert.equal(withContext.conversationIntent.type, "briefing_request");
  assert.equal(withContext.debug.memoryDecision, "ignore");
  assert.match(withContext.response, /rent|due|friday/i);
}

{
  const emptyReview = run("what do you remember about me?");
  assert.equal(emptyReview.conversationIntent.type, "memory_review_request");
  assert.equal(emptyReview.debug.memoryDecision, "ignore");
  assert.equal(emptyReview.debug.remembered, false);
  assert.doesNotMatch(emptyReview.response, /\bmemory id\b|\bcreatedAt\b|\bupdatedAt\b/i);
  assert.match(emptyReview.response, /memory|review|tell me/i);

  const momCapture = run("Mom birthday tomorrow");
  const stored = memoryFromSyncEngineResult(momCapture, reference);
  const withContext = run("what do you remember about me?", {
    storedMemories: stored ? [stored] : [],
  });
  assert.equal(withContext.conversationIntent.type, "memory_review_request");
  assert.doesNotMatch(withContext.response, /\bmemory id\b|\bcreatedAt\b|\bupdatedAt\b/i);
  assert.match(withContext.response, /review|memory/i);
  assert.match(withContext.response, /family|calendar|work|money|health|relationships/i);
}

{
  const result = run("why did you remember that?");
  assert.equal(result.conversationIntent.type, "explanation_request");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.debug.remembered, false);
  assert.match(result.response, /specific memory|decision|clarified|explain/i);
}

{
  const result = run("actually that was Friday, not Thursday");
  assert.equal(result.conversationIntent.type, "correction_request");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.futureFollowUpDecision.decision, "ask_now");
  assert.match(result.response, /what memory|which|correct/i);
}

{
  const result = run("i skipped my workout again");
  assert.equal(result.conversationIntent.type, "capture");
  assert.ok(
    ["remember", "update_existing", "ask_follow_up"].includes(
      result.debug.memoryDecision,
    ),
  );
}

{
  const result = run("rent is due Friday");
  assert.equal(result.conversationIntent.type, "capture");
  assert.ok(["remember", "update_existing"].includes(result.debug.memoryDecision));
}

console.log("sync-engine-conversation-intent tests passed");
