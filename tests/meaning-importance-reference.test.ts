import assert from "node:assert/strict";

import { processSyncMessage } from "@/lib/sync-engine";

const reference = new Date("2026-06-24T12:00:00");

{
  const result = processSyncMessage({
    text: "Rent is due Friday.",
    reference,
    engineMode: "dryRun",
  });

  assert.equal(result.debug.memoryDecision, "remember");
  assert.equal(
    result.prepared?.meaning.importance,
    "high",
    "rent due within a week must score high relative to the capture reference date",
  );
  assert.equal(result.debug.affectedTimeframe, "this_week");
  assert.equal(
    result.briefingEffect.priorityImpact,
    "high",
    "this-week rent deadline should carry high briefing priority impact",
  );
}

console.log("meaning-importance-reference tests passed");
