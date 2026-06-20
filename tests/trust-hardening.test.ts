import assert from "node:assert/strict";

import { buildUpdatedCaptureFromPlan } from "@/lib/capture-action-resolver";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import { resolveSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import { detectAmbiguity } from "@/lib/trust/ambiguity-detection";
import { buildPriorityConflictOverlap } from "@/lib/trust/conflict-priority";
import {
  parseCapturedItemsFromStorage,
  serializeCapturedItemsForStorage,
} from "@/lib/trust/persistence";
import {
  formatReferenceCandidateLabel,
  resolveCaptureReference,
} from "@/lib/trust/reference-resolution";
import { detectSyncCommandIntent } from "@/lib/sync-command-intent";
import { analyzeMeaning } from "@/lib/intelligence/meaning-engine";

const now = new Date("2026-06-09T12:00:00");

function seedCapture(
  input: string,
  overrides: Partial<CapturedSyncItem> = {},
): CapturedSyncItem {
  const plan = createPulsePlan(input, { timeline: { now, userContext: {} } });
  const timestamp = now.toISOString();

  return {
    id: plan.id,
    title: plan.title,
    category: plan.category,
    prompt: plan.prompt,
    destinations: resolveSyncDestinations(plan),
    dateLabel: plan.dateLabel,
    timeLabel: plan.timeLabel,
    timeline: plan.timeline,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    ...overrides,
  };
}

{
  const text = "change date on wednesday to tuesday";
  const intent = detectSyncCommandIntent(text);
  assert.equal(intent.type, "edit");

  const ambiguity = detectAmbiguity({ text, commandIntent: intent });
  assert.ok(
    ambiguity.interpretations.some((entry) => entry.intent === "edit"),
  );
  assert.ok(
    ambiguity.interpretations.some((entry) => entry.id === "edit-existing"),
  );

  const createPlan = createPulsePlan(text, { timeline: { now } });
  assert.notEqual(createPlan.timeline?.kind, "date_range");
}

{
  const ambiguity = detectAmbiguity({ text: "move gym friday" });
  assert.equal(ambiguity.ambiguous, true);
  assert.ok(ambiguity.reason && ambiguity.reason.length > 0);
  assert.ok(
    ambiguity.interpretations.some(
      (entry) =>
        entry.id === "clarify-move" ||
        entry.id === "clarify-command" ||
        entry.payload &&
          typeof entry.payload === "object" &&
          "needsClarification" in entry.payload,
    ),
  );
}

{
  const doctor = seedCapture("doctor appointment monday at 9am", {
    id: "doctor-1",
    title: "Doctor Appointment",
    destinations: ["Health", "Calendar"],
  });
  const dentist = seedCapture("dentist appointment friday at 2pm", {
    id: "dentist-1",
    title: "Dentist Appointment",
    destinations: ["Health", "Calendar"],
  });

  const resolution = resolveCaptureReference({
    commandText: "delete appointment",
    items: [doctor, dentist],
    now,
  });

  assert.equal(resolution.status, "multiple_matches");
  assert.ok((resolution.candidates?.length ?? 0) >= 2);
  assert.ok(
    formatReferenceCandidateLabel(doctor).includes("Doctor Appointment"),
  );
}

{
  const daughter = seedCapture(
    "my daughter has an event at her school tomorrow at 7 am",
    {
      id: "daughter-1",
      title: "Daughter's School Event",
      destinations: ["Family", "School", "Calendar"],
      meaning: analyzeMeaning({
        title: "Daughter's School Event",
        normalizedText:
          "my daughter has an event at her school tomorrow at 7 am",
        category: "task",
        destinations: ["Family", "School", "Calendar"],
      }),
      protectedTime: {
        enabled: true,
        reason: "You may want to protect this time.",
        createdAt: now.toISOString(),
      },
    },
  );

  const serialized = serializeCapturedItemsForStorage([daughter]);
  const loaded = parseCapturedItemsFromStorage(serialized)[0];

  assert.equal(loaded.meaning?.importance, "high");
  assert.equal(loaded.protectedTime?.enabled, true);
  assert.ok(loaded.destinations.includes("Family"));
  assert.ok(loaded.destinations.includes("School"));
  assert.ok(loaded.timeline?.startTime);

  const deleted = {
    ...daughter,
    status: "cancelled" as const,
    deletedAt: now.toISOString(),
  };
  const reloaded = parseCapturedItemsFromStorage(
    serializeCapturedItemsForStorage([deleted]),
  )[0];
  assert.equal(reloaded.deletedAt, deleted.deletedAt);
  assert.equal(reloaded.status, "cancelled");

  const existing = daughter;
  const editPlan = createPulsePlan("daughter school event tomorrow at 8 am", {
    timeline: { now },
  });
  const updated = buildUpdatedCaptureFromPlan(
    existing,
    editPlan,
    existing.destinations,
    existing.title,
  );
  assert.equal(updated.meaning?.importance, "high");
  assert.equal(updated.protectedTime?.enabled, true);
}

{
  const protectedDaughter = seedCapture(
    "my daughter has an event at her school tomorrow at 7 am",
    {
      id: "daughter-protected",
      title: "Daughter's School Event",
      destinations: ["Family", "School", "Calendar"],
      protectedTime: { enabled: true, createdAt: now.toISOString() },
      meaning: analyzeMeaning({
        title: "Daughter's School Event",
        normalizedText:
          "my daughter has an event at her school tomorrow at 7 am",
        category: "task",
        destinations: ["Family", "School", "Calendar"],
      }),
    },
  );

  const groceriesPlan = createPulsePlan("buy groceries tomorrow at 7am", {
    timeline: { now },
  });
  const groceriesMeaning = analyzeMeaning({
    title: groceriesPlan.title,
    normalizedText: groceriesPlan.prompt,
    category: groceriesPlan.category,
    destinations: resolveSyncDestinations(groceriesPlan),
  });

  const overlap = buildPriorityConflictOverlap(
    {
      headline: "This overlaps with Daughter's School Event.",
      existingTitle: protectedDaughter.title,
      existingRange: "7:00 AM–8:00 AM",
      proposedTitle: groceriesPlan.title,
      proposedRange: "7:00 AM–8:00 AM",
      dateLabel: "Tomorrow",
      existingProtected: true,
      existingArea: "family",
    },
    {
      meaning: groceriesMeaning,
      prompt: groceriesPlan.prompt,
      destinations: resolveSyncDestinations(groceriesPlan),
    },
    protectedDaughter,
  );

  assert.match(overlap.headline ?? "", /protected family time/i);
  assert.match(overlap.conflictMeaning ?? "", /groceries|moving|instead/i);
}

{
  const plan = createPulsePlan(
    "my daughter has an event at her school tomorrow at 7 am",
    { timeline: { now } },
  );
  const preview = buildSyncPreviewViewModel(plan, {
    calendarItems: [],
    workSchedule: null,
  });

  assert.match(
    preview.why.summary ?? "",
    /morning availability tomorrow|important family commitment/i,
  );
  assert.match(
    preview.why.protectionRecommendation ?? preview.why.summary ?? "",
    /protect this time/i,
  );
  assert.equal(preview.what.category, "");
  assert.equal(preview.what.intent, undefined);
  assert.ok(!preview.why.summary?.includes("timelineRole"));
  assert.ok(!preview.why.summary?.includes("confidence"));
}

console.log("Trust hardening tests passed");
