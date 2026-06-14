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
    "i hacve a date with my girfreind wednsday at 9pm",
  );
  assert.equal(
    normalized.normalized,
    "i have a date with my girlfriend wednesday at 9pm",
  );
  assert.ok(normalized.corrections.includes("hacve -> have"));
  assert.ok(normalized.corrections.includes("girfreind -> girlfriend"));
  assert.ok(normalized.corrections.includes("wednsday -> wednesday"));

  const result = plan("i hacve a date with my girfreind wednsday at 9pm");
  assert.equal(result.title, "Date with Girlfriend");
  assert.equal(result.category, "date-night");
  assert.deepEqual(resolveSyncDestinations(result), ["Relationships", "Calendar"]);
  assert.equal(result.timeline?.startTime, "21:00");
  assert.ok((result.timeline?.confidence ?? 0) >= 0.85);
  assert.match(result.timeline?.confidenceLabel ?? "", /high|medium/);
}

{
  const normalized = normalizeCaptureInput("wrk scheduele sun thru wed 11to9pm");
  assert.match(normalized.normalized, /work schedule sunday through wednesday 11 to 9pm/);

  const result = plan("wrk scheduele sun thru wed 11to9pm");
  assert.equal(result.title, "Work Schedule");
  assert.equal(result.category, "work-schedule");
  assert.equal(result.timeline?.kind, "recurring");
  assert.equal(result.timeline?.startTime, "11:00");
  assert.equal(result.timeline?.endTime, "21:00");
  assert.ok((result.timeline?.confidence ?? 0) >= 0.85);
}

{
  const normalized = normalizeCaptureInput("gymtomorrow at 6");
  assert.equal(normalized.normalized, "gym tomorrow at 6");

  const result = plan("gymtomorrow at 6");
  assert.equal(result.category, "workout");
  assert.equal(result.timeline?.label, "Tomorrow");
  assert.ok(result.timeline?.startTime);
  assert.deepEqual(resolveSyncDestinations(result), ["Health", "Calendar"]);
  assert.ok((result.timeline?.confidence ?? 0) >= 0.68);
}

{
  const normalized = normalizeCaptureInput("rentnextfriday");
  assert.equal(normalized.normalized, "rent next friday");

  const result = plan("rentnextfriday");
  assert.equal(result.category, "reminder");
  assert.deepEqual(resolveSyncDestinations(result), ["Finance", "Calendar"]);
  assert.ok(result.timeline?.startDate);
  assert.ok((result.timeline?.confidence ?? 0) >= 0.68);
}

{
  const normalized = normalizeCaptureInput("i wroked monady 11-9pm");
  assert.match(normalized.normalized, /i worked monday 11 to 9pm/);

  const result = plan("i wroked monady 11-9pm");
  assert.equal(result.category, "workday");
  assert.equal(result.timeline?.tense, "past");
  assert.equal(result.timeline?.startTime, "11:00");
  assert.equal(result.timeline?.endTime, "21:00");
  assert.ok((result.timeline?.confidence ?? 0) >= 0.85);
}

{
  const normalized = normalizeCaptureInput("call mommm tommorow 11am");
  assert.equal(normalized.normalized, "call mom tomorrow 11am");

  const result = plan("call mommm tommorow 11am");
  assert.equal(result.title, "Call Mom");
  assert.equal(result.category, "date-night");
  assert.equal(result.timeline?.label, "Tomorrow");
  assert.equal(result.timeline?.startTime, "11:00");
  const preview = buildSyncPreviewViewModel(result);
  assert.equal(preview.what.title, "Call Mom");
  assert.ok((result.timeline?.confidence ?? 0) >= 0.85);
}

console.log("fuzzy input normalization tests passed");
