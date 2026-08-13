import assert from "node:assert/strict";

import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { resolveSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";

const now = new Date("2026-06-10T12:00:00");

function plan(input: string) {
  return createPulsePlan(input, {
    timeline: { now, userContext: {} },
  });
}

{
  const normalized = normalizeCaptureInput(
    "i hacve a date with my girlfriend on wednesday at 9pm",
  );
  assert.equal(
    normalized.normalized,
    "i have a date with my girlfriend on wednesday at 9pm",
  );
  assert.ok(normalized.corrections.includes("hacve -> have"));

  const result = plan("i hacve a date with my girlfriend on wednesday at 9pm");
  const preview = buildSyncPreviewViewModel(result);

  assert.equal(result.prompt, normalized.normalized);
  assert.equal(result.originalPrompt, "i hacve a date with my girlfriend on wednesday at 9pm");
  assert.equal(result.title, "Date with Girlfriend");
  assert.equal(preview.what.title, "Date with Girlfriend");
  assert.equal(result.category, "date-night");
  assert.deepEqual(resolveSyncDestinations(result), ["Relationships", "Calendar"]);
  assert.ok(result.timeline?.startDate);
  assert.equal(result.timeline?.startTime, "21:00");
  assert.equal(result.timeline?.timelineRole, "event");
  assert.ok((result.timeline?.confidence ?? 0) >= 0.82);
}

{
  const result = plan("worked wednesday 11 to 9");

  assert.equal(result.timeline?.tense, "past");
  assert.equal(result.timeline?.startDate, "2026-06-03");
  assert.equal(result.timeline?.startTime, "11:00");
  assert.equal(result.timeline?.endTime, "21:00");
  assert.deepEqual(resolveSyncDestinations(result), ["Work", "Calendar"]);
}

{
  const result = plan("i work wednesday 11 to 9");

  assert.ok(result.timeline?.startDate || result.timeline?.recurrence);
  assert.equal(result.timeline?.startTime, "11:00");
  assert.equal(result.timeline?.endTime, "21:00");
  assert.deepEqual(resolveSyncDestinations(result), ["Work", "Calendar"]);
}

{
  const result = plan("call mom tomorrow 11am");

  assert.equal(result.title, "Call Mom");
  assert.deepEqual(resolveSyncDestinations(result), ["Family", "Calendar"]);
  assert.ok(!resolveSyncDestinations(result).includes("Goals"));
}

{
  assert.deepEqual(resolveSyncDestinations(plan("school assignment due Friday")), [
    "School",
    "Calendar",
  ]);
  // Project-work language (including Sync) routes to Work, not Goals.
  assert.deepEqual(resolveSyncDestinations(plan("work on Sync for 2 hours")), [
    "Work",
    "Calendar",
  ]);
}

console.log("Timeline Intelligence v2 tests passed");
