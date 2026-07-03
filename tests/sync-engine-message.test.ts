import assert from "node:assert/strict";

import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import { processSyncMessage } from "@/lib/sync-engine";
import { memoryFromSyncEngineResult } from "@/lib/sync-engine/tools/lab-state";

const reference = new Date("2026-06-24T12:00:00");

type MessageExample = {
  text: string;
  remembered: boolean;
  category?: string;
  timeframe: string;
  destination: SyncDestination;
};

const examples: MessageExample[] = [
  {
    text: "I worked on Sync from 8pm to 10pm",
    remembered: true,
    category: "task",
    timeframe: "today",
    destination: "Work",
  },
  {
    text: "payday is Friday at 5am",
    remembered: true,
    timeframe: "this_week",
    destination: "Finance",
  },
  {
    text: "mom's birthday is tomorrow",
    remembered: true,
    timeframe: "tomorrow",
    destination: "Family",
  },
  {
    text: "I skipped my workout again",
    remembered: true,
    category: "workout",
    timeframe: "today",
    destination: "Health",
  },
  {
    text: "I spent more than I wanted eating out this week",
    remembered: true,
    category: "expense",
    timeframe: "today",
    destination: "Finance",
  },
  {
    text: "I feel tired every morning before work",
    remembered: false,
    category: "general",
    timeframe: "unscheduled",
    destination: "Health",
  },
  {
    text: "dinner with mom moved to Friday",
    remembered: true,
    timeframe: "this_week",
    destination: "Family",
  },
  {
    text: "rent is due after payday",
    remembered: false,
    category: "expense",
    timeframe: "unscheduled",
    destination: "Finance",
  },
  {
    text: "I don't want to forget to cancel Uber",
    remembered: false,
    category: "reminder",
    timeframe: "unscheduled",
    destination: "Calendar",
  },
  {
    text: "today was quiet",
    remembered: true,
    category: "general",
    timeframe: "today",
    destination: "Calendar",
  },
] as const;

for (const example of examples) {
  const result = processSyncMessage({
    text: example.text,
    reference,
  });

  assert.equal(
    result.debug.remembered,
    example.remembered,
    `${example.text}: remembered decision`,
  );
  assert.equal(
    result.debug.affectedTimeframe,
    example.timeframe,
    `${example.text}: affected timeframe`,
  );
  if (example.category) {
    assert.equal(
      result.debug.category,
      example.category,
      `${example.text}: category`,
    );
  }
  assert.ok(
    result.prepared?.destinations.includes(example.destination),
    `${example.text}: expected destination ${example.destination}`,
  );
  assert.ok(
    result.response.length > 0,
    `${example.text}: expected a short response`,
  );
  assert.ok(
    result.debug.consequenceSummary.length > 0,
    `${example.text}: expected consequence summary`,
  );
  assert.ok(
    result.debug.confidence >= 0 && result.debug.confidence <= 1,
    `${example.text}: confidence is normalized`,
  );
  assert.ok("remembered" in result.debug);
  assert.ok("memoryDecision" in result.debug);
  assert.ok("category" in result.debug);
  assert.ok("importance" in result.debug);
  assert.ok("consequenceSummary" in result.debug);
  assert.ok("affectedTimeframe" in result.debug);
  assert.ok("shouldSurfaceLater" in result.debug);
  assert.ok("relatedMemoryIds" in result.debug);
  assert.ok("relatedMemoriesFound" in result.debug);
  assert.ok("duplicateUpdateCandidate" in result.debug);
  assert.ok("wouldCreateMemory" in result.debug);
  assert.ok("wouldUpdateExistingMemory" in result.debug);
  assert.ok("dryRun" in result.debug);
  assert.ok("confidence" in result.debug);
  assert.ok(result.engineMode);
  assert.ok(result.futureFollowUpDecision.decision);
  assert.ok(typeof result.briefingEffect.changed === "boolean");
  assert.ok(result.reasoningTrace.length >= 6);
  assert.ok(typeof result.contextUse.memoryCount === "number");
}

{
  const result = processSyncMessage({
    text: "",
    reference,
  });

  assert.equal(result.response, "");
  assert.equal(result.debug.memoryDecision, "ignore");
  assert.equal(result.debug.remembered, false);
  assert.equal(result.debug.affectedTimeframe, "unscheduled");
  assert.equal(result.futureFollowUpDecision.decision, "none");
  assert.equal(result.briefingEffect.changed, false);
  assert.deepEqual(
    result.reasoningTrace.map((trace) => trace.step),
    [
      "parsed_input",
      "classified_meaning",
      "memory_decision",
      "consequence_detection",
      "judgment_decision",
      "response_generation",
    ],
  );
}

{
  const result = processSyncMessage({
    text: "remember this",
    reference,
  });

  assert.equal(result.debug.memoryDecision, "ask_follow_up");
  assert.equal(result.debug.remembered, false);
  assert.equal(result.prepared, null);
  assert.equal(result.futureFollowUpDecision.decision, "ask_now");
}

{
  const result = processSyncMessage({
    text: "I don't want to forget to cancel Uber",
    reference,
  });

  assert.equal(result.futureFollowUpDecision.decision, "ask_now");
  assert.match(result.futureFollowUpDecision.reason, /more detail|place/i);
  assert.ok(result.futureFollowUpDecision.confidence >= 0);
}

{
  const seed = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    reference,
  });
  const existingMemory = memoryFromSyncEngineResult(seed, reference);
  assert.ok(existingMemory);

  const withoutContext = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    reference,
  });

  assert.deepEqual(withoutContext.debug.relatedMemoryIds, []);
  assert.equal(withoutContext.debug.relatedMemoriesFound, 0);
  assert.equal(withoutContext.debug.duplicateUpdateCandidate, null);
  assert.equal(withoutContext.debug.wouldCreateMemory, true);
  assert.equal(withoutContext.debug.wouldUpdateExistingMemory, false);
}

{
  const seed = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    reference,
  });
  const existingMemory = memoryFromSyncEngineResult(seed, reference);
  assert.ok(existingMemory);

  const items: CapturedSyncItem[] = [existingMemory];
  const result = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    context: {
      capturedItems: items,
      currentDate: reference,
      dryRun: true,
    },
  });

  assert.deepEqual(result.debug.relatedMemoryIds, [existingMemory.id]);
  assert.equal(result.debug.relatedMemoriesFound, 1);
  assert.equal(result.debug.memoryDecision, "update_existing");
  assert.equal(result.debug.duplicateUpdateCandidate?.id, existingMemory.id);
  assert.equal(result.debug.wouldCreateMemory, false);
  assert.equal(result.debug.wouldUpdateExistingMemory, true);
  assert.equal(result.debug.dryRun, true);
  assert.equal(result.engineMode, "dryRun");
  assert.equal(result.contextUse.usedStoredMemories, true);
  assert.equal(result.contextUse.usedLabMemories, false);
  assert.equal(result.contextUse.memoryCount, 1);
  assert.equal(result.contextUse.relatedMemoryCount, 1);
  assert.equal(result.contextUse.duplicateCandidateFound, true);
}

{
  const storedSeed = processSyncMessage({
    text: "Rent is due Friday.",
    reference,
  });
  const labSeed = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    reference,
  });
  const storedMemory = memoryFromSyncEngineResult(storedSeed, reference);
  const labMemory = memoryFromSyncEngineResult(labSeed, reference);
  assert.ok(storedMemory);
  assert.ok(labMemory);

  const result = processSyncMessage({
    text: "Dinner moved to Friday.",
    storedMemories: [storedMemory],
    labMemories: [labMemory],
    reference,
    engineMode: "dryRun",
  });

  assert.equal(result.contextUse.usedStoredMemories, true);
  assert.equal(result.contextUse.usedLabMemories, true);
  assert.equal(result.contextUse.memoryCount, 2);
  assert.equal(result.engineMode, "dryRun");
}

{
  const result = processSyncMessage({
    text: "mom's birthday is tomorrow",
    reference,
    engineMode: "dryRun",
  });

  assert.equal(result.briefingEffect.changed, true);
  assert.equal(result.briefingEffect.priorityImpact, "high");
  assert.equal(result.briefingEffect.affectedSection, "noticing");
  assert.match(result.briefingEffect.reason, /brief/i);
}

{
  const seed = processSyncMessage({
    text: "Rent is due Friday.",
    reference,
  });
  const existingMemory = memoryFromSyncEngineResult(seed, reference);
  assert.ok(existingMemory);

  const items: CapturedSyncItem[] = [existingMemory];
  const before = JSON.stringify(items);
  const result = processSyncMessage({
    text: "Rent is due Friday.",
    context: {
      capturedItems: items,
      currentDate: reference,
      dryRun: true,
    },
  });

  assert.equal(JSON.stringify(items), before);
  assert.equal(items.length, 1);
  assert.equal(result.debug.dryRun, true);
  assert.equal(result.prepared?.plan.id === existingMemory.id, false);
  assert.equal(result.engineMode, "dryRun");
}

{
  const seed = processSyncMessage({
    text: "Dinner with Mom moved to Friday.",
    reference,
  });
  const existingMemory = memoryFromSyncEngineResult(seed, reference);
  assert.ok(existingMemory);

  const result = processSyncMessage({
    text: "Dinner with Mom moved to Friday.",
    context: {
      capturedItems: [existingMemory],
      currentDate: reference,
      dryRun: true,
    },
  });

  assert.equal(result.debug.duplicateUpdateCandidate?.id, existingMemory.id);
  assert.equal(result.debug.memoryDecision, "update_existing");
}

{
  const result = processSyncMessage({
    text: "I worked on Sync from 8pm to 10pm",
    reference,
  });

  assert.deepEqual(
    result.reasoningTrace.map((trace) => trace.step),
    [
      "parsed_input",
      "classified_meaning",
      "memory_decision",
      "consequence_detection",
      "judgment_decision",
      "response_generation",
    ],
  );
  assert.ok(result.reasoningTrace.every((trace) => trace.summary.length > 0));
}

console.log("sync-engine-message tests passed");
