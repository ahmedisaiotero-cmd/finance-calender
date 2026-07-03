import assert from "node:assert/strict";

import {
  buildLifeGraphDiagnostics,
  buildLifeGraphSnapshot,
  normalizeCapturedItems,
} from "@/lib/intelligence/life-graph";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { processSyncMessage } from "@/lib/sync-engine";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00.000Z");
const referenceDate = "2026-06-14";
const generatedAt = "2026-06-14T18:00:00.000Z";

function buildItems(texts: string[]) {
  const store = createTestCaptureStore();
  for (const text of texts) {
    const result = captureFromBriefInput(
      text,
      { items: store.items, reference },
      store.handlers,
    );
    assert.ok(result, `expected capture to succeed for: ${text}`);
  }
  return store.items;
}

{
  const items = buildItems([
    "I worked on Sync from 8pm to 10pm",
    "Payday is Friday",
    "I keep delaying cancelling Uber",
    "I spent less this month",
  ]);
  const diagnostics = buildLifeGraphDiagnostics({
    items,
    referenceDate,
    generatedAt,
  });

  assert.ok(diagnostics.snapshotId.length > 0);
  assert.ok(diagnostics.observationCount > 0);
  assert.ok(diagnostics.normalizedObjectCount > 0);
  assert.ok(diagnostics.nodeCount > 0);
  assert.ok(diagnostics.edgeCount >= 0);
  assert.ok(diagnostics.continuitySignalSummaries.length > 0);
  assert.ok(diagnostics.continuityResolutionStatuses.length > 0);
  assert.ok(diagnostics.interpretationSummaries.length > 0);
  assert.ok(diagnostics.beliefStatements.length > 0);
  assert.ok(diagnostics.relevantNodeCount > 0);
  assert.ok(diagnostics.narrativeEvidenceLines.length > 0);
  assert.ok(diagnostics.narrativeForbiddenClaims.length > 0);
}

{
  const items = buildItems([
    "I worked on Sync from 8pm to 10pm",
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);
  const first = buildLifeGraphDiagnostics({
    items,
    referenceDate,
    generatedAt,
  });
  const second = buildLifeGraphDiagnostics({
    items,
    referenceDate,
    generatedAt,
  });

  assert.deepEqual(first, second, "diagnostics output should be deterministic");
}

{
  const items = buildItems(["Payday is Friday", "I spent less this month"]);
  const before = JSON.stringify(items);
  buildLifeGraphDiagnostics({
    items,
    referenceDate,
    generatedAt,
  });
  assert.equal(JSON.stringify(items), before, "captured items should not be mutated");
}

{
  const items = buildItems([
    "I worked on Sync from 8pm to 10pm",
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);

  const briefBefore = buildDailyBrief({
    items,
    reference,
    workSchedule: null,
  });
  const todayBefore = buildTodayView({
    brief: briefBefore,
    consequences: briefBefore.consequences,
    items,
    reference,
  });

  buildLifeGraphDiagnostics({
    items,
    referenceDate,
    generatedAt,
  });

  const briefAfter = buildDailyBrief({
    items,
    reference,
    workSchedule: null,
  });
  const todayAfter = buildTodayView({
    brief: briefAfter,
    consequences: briefAfter.consequences,
    items,
    reference,
  });

  assert.deepEqual(briefAfter, briefBefore, "daily brief should remain unchanged");
  assert.deepEqual(todayAfter, todayBefore, "today view should remain unchanged");
}

{
  const items = buildItems(["Payday is Friday", "I keep delaying cancelling Uber"]);

  const baseline = processSyncMessage({
    text: "Mom's birthday is tomorrow",
    storedMemories: items,
    reference,
    engineMode: "dryRun",
  });

  buildLifeGraphDiagnostics({
    items,
    referenceDate,
    generatedAt,
  });

  const after = processSyncMessage({
    text: "Mom's birthday is tomorrow",
    storedMemories: items,
    reference,
    engineMode: "dryRun",
  });

  assert.equal(after.runtime.after.judgment.primary, baseline.runtime.after.judgment.primary);
}

{
  const items = buildItems(["I ate lunch"]);
  const diagnostics = buildLifeGraphDiagnostics({
    items,
    referenceDate,
    generatedAt,
  });
  assert.equal(
    diagnostics.narrativeEvidenceLines.some((line) =>
      /\b(graph|node|edge|traversal|projection)\b/i.test(line),
    ),
    false,
  );
}

{
  const items = buildItems(["Payday is Friday"]);
  const snapshot = buildLifeGraphSnapshot({
    normalizations: normalizeCapturedItems(items),
    referenceDate,
    generatedAt,
  });
  assert.ok(snapshot.id.length > 0);
  // Diagnostics are optional and not required for normal snapshot/buildToday flows.
}

console.log("life-graph diagnostics tests passed");
