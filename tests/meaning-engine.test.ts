import assert from "node:assert/strict";

import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { resolveSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import { analyzeMeaning } from "@/lib/intelligence/meaning-engine";
import {
  detectSyncTimeBlockOverlaps,
  proposedSyncTimeBlocksFromPlan,
} from "@/lib/sync-time-blocks";
import { createTestWorkSchedule } from "@/tests/test-fixtures";

const reference = new Date("2026-06-09T12:00:00");

const morningWorkSchedule = createTestWorkSchedule({
  days: ["SU", "MO", "TU", "WE", "TH", "FR", "SA"],
  startTime: "07:00",
  endTime: "15:00",
});

function plan(input: string) {
  return createPulsePlan(input, {
    timeline: { now: reference, userContext: {} },
  });
}

{
  const input = "my daughter has an event at her school tomorrow at 7 am";
  const result = plan(input);
  const destinations = resolveSyncDestinations(result);

  assert.match(result.title, /Daughter's School Event|School Event/);
  assert.ok(destinations.includes("Family"));
  assert.ok(destinations.includes("School"));
  assert.ok(destinations.includes("Calendar"));

  const overlaps = detectSyncTimeBlockOverlaps({
    plan: result,
    items: [],
    workSchedule: morningWorkSchedule,
    reference,
  });

  const meaning = analyzeMeaning({
    title: result.title,
    normalizedText: result.prompt,
    category: result.category,
    destinations,
    timeline: result.timeline,
    timeBlocks: proposedSyncTimeBlocksFromPlan(result, reference),
    overlaps,
  });

  assert.ok(["high", "critical"].includes(meaning.importance));
  assert.equal(meaning.protection.eligible, true);
  assert.equal(meaning.protection.recommended, true);
  assert.ok(
    meaning.suggestedActions.some((action) => action.actionType === "protect_time"),
  );
  assert.ok(overlaps.length >= 1);
  assert.equal(overlaps[0].existingTitle, "Work");

  const preview = buildSyncPreviewViewModel(result, {
    calendarItems: [],
    workSchedule: morningWorkSchedule,
  });

  assert.match(preview.why.summary ?? "", /morning availability tomorrow|important family commitment/i);
  assert.match(preview.when.overlap?.headline ?? "", /overlaps with Work/i);
  assert.match(
    preview.when.overlap?.conflictMeaning ?? "",
    /protect this time|adjust work availability|adjust timing/i,
  );
}

{
  const input = "date with girlfriend friday at 7pm";
  const result = plan(input);
  const destinations = resolveSyncDestinations(result);

  assert.deepEqual(destinations, ["Relationships", "Calendar"]);

  const meaning = analyzeMeaning({
    title: result.title,
    normalizedText: result.prompt,
    category: result.category,
    destinations,
    timeline: result.timeline,
    timeBlocks: proposedSyncTimeBlocksFromPlan(result, reference),
  });

  assert.ok(meaning.importance === "medium" || meaning.importance === "high");
  assert.ok(meaning.protection.eligible || meaning.protection.recommended);
}

{
  const input = "buy groceries tomorrow";
  const result = plan(input);
  const meaning = analyzeMeaning({
    title: result.title,
    normalizedText: result.prompt,
    category: result.category,
    destinations: resolveSyncDestinations(result),
    timeline: result.timeline,
    timeBlocks: proposedSyncTimeBlocksFromPlan(result, reference),
  });

  assert.ok(meaning.importance === "low" || meaning.importance === "medium");
  assert.equal(meaning.protection.recommended, false);
}

{
  const input = "doctor appointment monday at 9am";
  const result = plan(input);
  const destinations = resolveSyncDestinations(result);

  assert.ok(destinations.includes("Health"));
  assert.ok(destinations.includes("Calendar"));

  const meaning = analyzeMeaning({
    title: result.title,
    normalizedText: result.prompt,
    category: result.category,
    destinations,
    timeline: result.timeline,
    timeBlocks: proposedSyncTimeBlocksFromPlan(result, reference),
  });

  assert.equal(meaning.importance, "high");
  assert.equal(meaning.protection.recommended, true);

  const preview = buildSyncPreviewViewModel(result, {
    calendarItems: [],
    workSchedule: morningWorkSchedule,
  });

  assert.match(preview.why.summary ?? "", /health commitment/i);
}

console.log("Meaning engine tests passed");
