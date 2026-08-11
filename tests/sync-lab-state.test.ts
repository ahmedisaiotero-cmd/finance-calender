import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { emptyRuntimeBrainEvaluation } from "@/lib/sync-engine/brain/build-runtime-brain";
import { processSyncMessage, type SyncEngineMessageResult } from "@/lib/sync-engine";
import {
  buildSyncLabBrief,
  buildSyncLabMemoryRows,
  buildSyncLabReviewGroups,
  filterSyncLabMemoryRows,
  filterSyncLabMemoryRowsByVisibility,
  memoryFromSyncEngineResult,
  resolveSyncLabMemoryContext,
  syncLabDisplayResponse,
  SYNC_LAB_CONTEXT_DEFAULT,
  SYNC_LAB_MEMORY_VISIBILITY_DEFAULT,
  SYNC_LAB_REVIEW_VISIBLE_LIMIT,
  type SyncLabMemoryVisibilityMap,
} from "@/lib/sync-engine/tools/lab-state";
import { createTestCapturedItem, createTestVisibilityMap } from "@/tests/test-fixtures";

const reference = new Date("2026-06-24T12:00:00");

function mockLabResult(input: {
  response: string;
  responseEnginePrimary?: string;
  judgmentPrimary?: string;
  memoryDecision?: SyncEngineMessageResult["debug"]["memoryDecision"];
  wouldCreateMemory?: boolean;
  withPrepared?: boolean;
}): SyncEngineMessageResult {
  const runtime = emptyRuntimeBrainEvaluation();
  runtime.after.responseEnginePrimary = input.responseEnginePrimary ?? "";
  runtime.after.judgment.primary =
    input.judgmentPrimary ?? "Nothing needs your attention right now.";

  return {
    input: { raw: "test", normalized: "test" },
    response: input.response,
    prepared: input.withPrepared === false
      ? null
      : ({
          title: "Test memory",
          destinations: ["Family"],
          meaning: { importance: "medium" },
          plan: {
            id: "lab-mock-memory",
            category: "general",
            prompt: "test input",
            originalPrompt: "test input",
          },
        } as SyncEngineMessageResult["prepared"]),
    consequence: null,
    debug: {
      remembered: input.wouldCreateMemory ?? true,
      memoryDecision: input.memoryDecision ?? "remember",
      category: "general",
      importance: "medium",
      consequenceSummary: "none",
      affectedTimeframe: "unscheduled",
      shouldSurfaceLater: false,
      relatedMemoryIds: [],
      relatedMemoriesFound: 0,
      duplicateUpdateCandidate: null,
      wouldCreateMemory: input.wouldCreateMemory ?? true,
      wouldUpdateExistingMemory: false,
      dryRun: true,
      confidence: 0.7,
    },
    engineMode: "dryRun",
    futureFollowUpDecision: {
      decision: "none",
      reason: "test",
      confidence: 0.7,
    },
    briefingEffect: {
      changed: false,
      reason: "test",
      priorityImpact: "none",
    },
    reasoningTrace: [],
    contextUse: {
      usedStoredMemories: false,
      usedLabMemories: false,
      memoryCount: 0,
      relatedMemoryCount: 0,
      duplicateCandidateFound: false,
    },
    runtime,
    privacyCommand: {
      detected: false,
      type: "unknown",
      requiresConfirmation: false,
      safeToExecuteInDryRun: true,
    },
    vagueInput: {
      detected: false,
      missing: [],
      reason: "clear",
      recommendedAction: "low_confidence_memory",
    },
    conversationIntent: {
      type: "capture",
      confidence: 0.9,
      routedBeforeCapture: false,
      reason: "capture",
    },
    contradiction: {
      detected: false,
      type: "unknown",
      relatedMemoryIds: [],
      recommendedAction: "low_confidence_memory",
      reason: "none",
    },
    correctionTarget: {
      detected: false,
      confidence: 0,
      action: "none",
      candidateMemoryIds: [],
      reason: "none",
    },
  };
}

function reviewItemIds(groups: ReturnType<typeof buildSyncLabReviewGroups>) {
  return groups.flatMap((group) => group.items.map((item) => item.id));
}

{
  const before = buildSyncLabBrief({ items: [], reference }).preview;
  const result = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    items: [],
    reference,
  });
  const memory = memoryFromSyncEngineResult(result, reference);

  assert.ok(memory);
  assert.equal(memory.category, "date-night");
  assert.ok(memory.destinations.includes("Family"));

  const after = buildSyncLabBrief({ items: [memory], reference }).preview;

  assert.notEqual(before.lede, after.lede);
  assert.equal(result.briefingEffect.changed, true);
  assert.match(result.briefingEffect.reason, /brief/i);

  const rows = buildSyncLabMemoryRows({
    storedItems: [],
    testItems: [memory],
    reference,
    referenceCounts: { [memory.id]: 2 },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].timesReferenced, 2);
  assert.equal(rows[0].source, "test");
  assert.equal(rows[0].visibility, SYNC_LAB_MEMORY_VISIBILITY_DEFAULT);
  assert.ok(rows[0].confidence >= 0 && rows[0].confidence <= 1);

  assert.equal(filterSyncLabMemoryRows(rows, "family").length, 0);
  assert.equal(filterSyncLabMemoryRows(rows, "date-night").length, 1);
  assert.equal(filterSyncLabMemoryRowsByVisibility(rows, "visible").length, 0);
  assert.equal(filterSyncLabMemoryRowsByVisibility(rows, "internal").length, 1);
  assert.equal(
    buildSyncLabMemoryRows({
      storedItems: [],
      testItems: [memory],
      reference,
      visibility: { [memory.id]: "visible" },
    })[0].visibility,
    "visible",
  );
}

{
  const result = processSyncMessage({
    text: "remember this",
    items: [],
    reference,
  });

  assert.equal(memoryFromSyncEngineResult(result, reference), null);
  assert.equal(result.futureFollowUpDecision.decision, "ask_now");
  assert.match(result.futureFollowUpDecision.reason, /clarification|detail/i);
}

{
  assert.equal(SYNC_LAB_CONTEXT_DEFAULT, false);

  const storedSeed = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    reference,
  });
  const storedMemory = memoryFromSyncEngineResult(storedSeed, reference);
  assert.ok(storedMemory);

  const offContext = resolveSyncLabMemoryContext({
    storedItems: [storedMemory],
    testItems: [],
  });

  assert.equal(offContext.contextEnabled, false);
  assert.equal(offContext.storedMemories.length, 0);
  assert.equal(offContext.combinedMemories.length, 0);

  const onContext = resolveSyncLabMemoryContext({
    contextEnabled: true,
    storedItems: [storedMemory],
    testItems: [],
  });

  assert.equal(onContext.contextEnabled, true);
  assert.equal(onContext.storedMemories.length, 1);
  assert.equal(onContext.combinedMemories.length, 1);

  const isolatedResult = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    storedMemories: offContext.storedMemories,
    labMemories: offContext.labMemories,
    reference,
    engineMode: "dryRun",
  });

  assert.equal(isolatedResult.contextUse.memoryCount, 0);
  assert.equal(isolatedResult.contextUse.relatedMemoryCount, 0);
  assert.equal(isolatedResult.debug.wouldCreateMemory, true);
  assert.equal(isolatedResult.debug.wouldUpdateExistingMemory, false);

  const contextResult = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    storedMemories: onContext.storedMemories,
    labMemories: onContext.labMemories,
    reference,
    engineMode: "dryRun",
  });

  assert.equal(contextResult.contextUse.usedStoredMemories, true);
  assert.equal(contextResult.contextUse.memoryCount, 1);
  assert.equal(contextResult.contextUse.relatedMemoryCount, 1);
  assert.equal(contextResult.contextUse.duplicateCandidateFound, true);
  assert.equal(contextResult.debug.wouldCreateMemory, false);
  assert.equal(contextResult.debug.wouldUpdateExistingMemory, true);
  assert.equal(contextResult.debug.dryRun, true);
}

{
  const seed = processSyncMessage({
    text: "Rent is due Friday.",
    reference,
  });
  const storedMemory = memoryFromSyncEngineResult(seed, reference);
  assert.ok(storedMemory);

  const stored = [storedMemory];
  const before = JSON.stringify(stored);
  const result = processSyncMessage({
    text: "Rent is due Friday.",
    storedMemories: stored,
    labMemories: [],
    reference,
    engineMode: "dryRun",
  });

  assert.equal(JSON.stringify(stored), before);
  assert.equal(stored.length, 1);
  assert.equal(result.debug.dryRun, true);
}

{
  const seeds = [
    processSyncMessage({
      text: "I skipped my workout again.",
      reference,
      engineMode: "dryRun",
    }),
    processSyncMessage({
      text: "I spent too much eating out.",
      reference,
      engineMode: "dryRun",
    }),
    processSyncMessage({
      text: "Mom's birthday is tomorrow.",
      reference,
      engineMode: "dryRun",
    }),
  ];
  const memories = seeds.flatMap((result) => {
    const memory = memoryFromSyncEngineResult(result, reference);
    return memory ? [memory] : [];
  });
  assert.ok(memories.length >= 1);
  const baseMemory = memories[0];
  const reviewMemories: CapturedSyncItem[] = [
    createTestCapturedItem({
      ...baseMemory,
      id: "review-health",
      category: "workout",
      destinations: ["Health"],
      title: "Skipped workout",
      prompt: "I skipped my workout again.",
      originalPrompt: "I skipped my workout again.",
    }),
    createTestCapturedItem({
      ...baseMemory,
      id: "review-money",
      category: "expense",
      destinations: ["Finance"],
      title: "Eating out spending",
      prompt: "I spent too much eating out.",
      originalPrompt: "I spent too much eating out.",
    }),
    createTestCapturedItem({
      ...baseMemory,
      id: "review-family",
      category: "date-night",
      destinations: ["Family"],
      title: "Mom's birthday",
      prompt: "Mom's birthday is tomorrow.",
      originalPrompt: "Mom's birthday is tomorrow.",
    }),
  ];

  const groups = buildSyncLabReviewGroups({
    storedItems: [],
    testItems: reviewMemories,
    visibility: createTestVisibilityMap(
      reviewMemories.map((memory) => [memory.id, "visible"] as const),
    ),
  });

  const health = groups.find((group) => group.name === "Health");
  const money = groups.find((group) => group.name === "Money");
  const family = groups.find((group) => group.name === "Family");

  assert.ok(health);
  assert.ok(money);
  assert.ok(family);
  assert.ok(health.items.length >= 1);
  assert.ok(money.items.length >= 1);
  assert.ok(family.items.length >= 1);
  assert.match(health.items[0].thinks, /\S/);
  assert.match(health.items[0].evidence.join(" "), /workout/i);
  assert.ok(health.items[0].confidence >= 0 && health.items[0].confidence <= 1);
  assert.match(health.items[0].confidenceLabel, /low|medium|high/);
}

{
  const seed = processSyncMessage({
    text: "I skipped my workout again.",
    reference,
    engineMode: "dryRun",
  });
  const memory = memoryFromSyncEngineResult(seed, reference);
  assert.ok(memory);

  const visibleHealthMemories = Array.from({ length: 5 }, (_, index) => ({
    ...memory,
    id: `${memory.id}-${index}`,
    title: `Workout pattern ${index + 1}`,
    prompt: `I skipped my workout again ${index + 1}`,
    originalPrompt: `I skipped my workout again ${index + 1}`,
    meaning: memory.meaning ? { ...memory.meaning, importance: "high" as const } : undefined,
  }));
  const visibility: SyncLabMemoryVisibilityMap = Object.fromEntries(
    visibleHealthMemories.map((item) => [item.id, "visible" as const]),
  );
  const groups = buildSyncLabReviewGroups({
    storedItems: [],
    testItems: visibleHealthMemories,
    visibility,
  });
  const health = groups.find((group) => group.name === "Health");

  assert.ok(health);
  assert.equal(health.items.length, SYNC_LAB_REVIEW_VISIBLE_LIMIT);
}

{
  const enginePrimary = "Flight at 6:00 AM.";
  const result = mockLabResult({
    response: "Mom's birthday is tomorrow.",
    responseEnginePrimary: enginePrimary,
    judgmentPrimary: "Mom's birthday is tomorrow today.",
  });

  assert.equal(syncLabDisplayResponse(result), enginePrimary);
}

{
  const judgmentPrimary = "Rent is due Friday.";
  const result = mockLabResult({
    response: "Rent is due Friday.",
    responseEnginePrimary: "",
    judgmentPrimary,
  });

  assert.equal(syncLabDisplayResponse(result), judgmentPrimary);
}

{
  const captureResponse = "Sync will keep this in your money context.";
  const result = mockLabResult({
    response: captureResponse,
    responseEnginePrimary: "",
    judgmentPrimary: "Nothing needs your attention right now.",
  });

  assert.equal(syncLabDisplayResponse(result), captureResponse);
}

{
  const followUpResponse = "What is due?";
  const result = mockLabResult({
    response: followUpResponse,
    responseEnginePrimary: "Rent is due Friday.",
    judgmentPrimary: "Rent is due Friday.",
    memoryDecision: "ask_follow_up",
    wouldCreateMemory: false,
    withPrepared: false,
  });

  assert.equal(syncLabDisplayResponse(result), followUpResponse);
}

{
  const result = processSyncMessage({
    text: "Mom's birthday is tomorrow.",
    reference,
    engineMode: "dryRun",
  });
  const memory = memoryFromSyncEngineResult(result, reference);
  assert.ok(memory);

  const display = syncLabDisplayResponse(result);
  assert.equal(
    result.response,
    display,
    "current-turn response should be preferred for capture coherence",
  );
  assert.equal(memory.understanding, display);
  assert.equal(memory.understanding, result.response);
}

{
  const seed = processSyncMessage({
    text: "Rent is due Friday.",
    reference,
    engineMode: "dryRun",
  });
  const base = memoryFromSyncEngineResult(seed, reference);
  assert.ok(base);

  const visibleMemory: CapturedSyncItem = {
    ...base,
    id: "lab-visible-rent",
    title: "Rent due",
    prompt: "Rent is due Friday.",
    originalPrompt: "Rent is due Friday.",
    destinations: ["Finance"],
    category: "reminder",
  };
  const internalMemory: CapturedSyncItem = {
    ...base,
    id: "lab-internal-workout",
    title: "Skipped workout",
    prompt: "I skipped my workout again.",
    originalPrompt: "I skipped my workout again.",
    destinations: ["Health"],
    category: "workout",
  };
  const visibility = {
    [visibleMemory.id]: "visible" as const,
    [internalMemory.id]: "internal" as const,
  };

  const rows = buildSyncLabMemoryRows({
    storedItems: [],
    testItems: [visibleMemory, internalMemory],
    visibility,
  });
  const memoryVisibleRows = filterSyncLabMemoryRowsByVisibility(rows, "visible");
  const memoryInternalRows = filterSyncLabMemoryRowsByVisibility(rows, "internal");
  const reviewGroups = buildSyncLabReviewGroups({
    storedItems: [],
    testItems: [visibleMemory, internalMemory],
    visibility,
  });
  const reviewIds = reviewItemIds(reviewGroups);

  assert.equal(memoryVisibleRows.length, 1);
  assert.equal(memoryInternalRows.length, 1);
  assert.equal(memoryVisibleRows[0].id, visibleMemory.id);
  assert.equal(memoryInternalRows[0].id, internalMemory.id);
  assert.ok(reviewIds.includes(visibleMemory.id));
  assert.ok(!reviewIds.includes(internalMemory.id));
  assert.deepEqual(
    reviewIds.sort(),
    memoryVisibleRows.map((row) => row.id).sort(),
  );
}

{
  const seed = processSyncMessage({
    text: "Mom loves orchids.",
    reference,
    engineMode: "dryRun",
  });
  const base = memoryFromSyncEngineResult(seed, reference);
  assert.ok(base);

  const storedVisible: CapturedSyncItem = {
    ...base,
    id: "stored-visible-family",
    title: "Mom loves orchids",
    destinations: ["Family"],
  };
  const labInternal: CapturedSyncItem = {
    ...base,
    id: "lab-internal-note",
    title: "Internal note",
    prompt: "private lab note",
    originalPrompt: "private lab note",
    category: "general",
    destinations: ["Goals"],
  };
  const visibility = { [labInternal.id]: "internal" as const };

  const rows = buildSyncLabMemoryRows({
    storedItems: [storedVisible],
    testItems: [labInternal],
    visibility,
  });
  const reviewIds = reviewItemIds(
    buildSyncLabReviewGroups({
      storedItems: [storedVisible],
      testItems: [labInternal],
      visibility,
    }),
  );

  assert.equal(filterSyncLabMemoryRowsByVisibility(rows, "all").length, 2);
  assert.equal(filterSyncLabMemoryRowsByVisibility(rows, "visible").length, 1);
  assert.equal(filterSyncLabMemoryRowsByVisibility(rows, "internal").length, 1);
  assert.deepEqual(reviewIds, [storedVisible.id]);
}

console.log("sync-lab-state tests passed");
