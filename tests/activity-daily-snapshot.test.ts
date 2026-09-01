import assert from "node:assert/strict";

import { createActivityEvent } from "@/lib/activity/activity-event";
import { buildActivitySnapshot } from "@/lib/activity/daily-snapshot";
import type { ActivityEventInput } from "@/lib/activity";

let seq = 0;
function evt(partial: Partial<ActivityEventInput>): ReturnType<typeof createActivityEvent> {
  seq += 1;
  return createActivityEvent({
    id: partial.id ?? `evt-${seq}`,
    kind: partial.kind ?? "result",
    actor: partial.actor ?? { kind: "sync", label: "Sync" },
    source: partial.source ?? { service: "calendar" },
    timestamp: partial.timestamp ?? "2026-09-01T09:00:00.000Z",
    affectedAreas: partial.affectedAreas ?? ["calendar"],
    summary: partial.summary ?? "Did a thing.",
    evidence: partial.evidence ?? [],
    verification: partial.verification ?? "system_logged",
    confidence: partial.confidence ?? 0.9,
    reversibility: partial.reversibility ?? "reversible",
    permission: partial.permission ?? { scope: "calendar.write", state: "granted" },
    visibility: partial.visibility ?? "visible",
    correlationId: partial.correlationId ?? null,
    detail: partial.detail,
  });
}

function findUnresolved(
  snapshot: ReturnType<typeof buildActivitySnapshot>,
  reason: string,
) {
  return snapshot.unresolved.filter((item) => item.reason === reason);
}

// A clean, fully completed lifecycle: request -> approval -> execution -> result.
{
  const day = "2026-09-01";
  const events = [
    evt({ kind: "request", correlationId: "c-appt", summary: "Add dentist appointment.", timestamp: `${day}T08:00:00.000Z`, actor: { kind: "user", label: "You" }, verification: "self_reported" }),
    evt({ kind: "approval", correlationId: "c-appt", timestamp: `${day}T08:00:05.000Z` }),
    evt({ kind: "execution", correlationId: "c-appt", timestamp: `${day}T08:00:06.000Z` }),
    evt({ kind: "result", correlationId: "c-appt", summary: "Added dentist appointment for Sept 4.", timestamp: `${day}T08:00:07.000Z`, verification: "source_confirmed" }),
  ];

  const snapshot = buildActivitySnapshot(events, { dateKey: day });

  assert.equal(snapshot.whatHappened.length, 1);
  assert.equal(snapshot.whatHappened[0].succeeded, true);
  assert.equal(snapshot.whatHappened[0].summary, "Added dentist appointment for Sept 4.");
  assert.deepEqual(snapshot.whatWasAffected, ["calendar"]);
  assert.equal(snapshot.whatChanged.length, 1);
  assert.equal(snapshot.whatChanged[0].area, "calendar");
  assert.equal(snapshot.unresolved.length, 0);
  assert.equal(snapshot.suggestedNextSteps.length, 0);
}

// Duplicate / re-delivered events must be counted once.
{
  const base = { kind: "result" as const, correlationId: "c-dup", summary: "Logged a workout.", affectedAreas: ["health" as const], timestamp: "2026-09-01T12:00:00.000Z" };
  const a = evt({ id: "same", ...base });
  const aAgain = evt({ id: "same", ...base }); // identical id
  const reDelivered = evt({ id: "different-id", ...base }); // same shape, new id

  const snapshot = buildActivitySnapshot([a, aAgain, reDelivered], { dateKey: "2026-09-01" });
  assert.equal(snapshot.totalEvents, 3);
  assert.equal(snapshot.consideredEvents, 1);
  assert.equal(snapshot.whatHappened.length, 1);
}

// Conflicting evidence: a success and a failure for the same action.
{
  const events = [
    evt({ kind: "execution", correlationId: "c-conflict", summary: "Send rent payment.", affectedAreas: ["finance"] }),
    evt({ kind: "result", correlationId: "c-conflict", summary: "Rent payment sent.", affectedAreas: ["finance"] }),
    evt({ kind: "failure", correlationId: "c-conflict", summary: "Rent payment failed.", affectedAreas: ["finance"], reversibility: "irreversible" }),
  ];

  const snapshot = buildActivitySnapshot(events);
  const failed = findUnresolved(snapshot, "failed");
  assert.equal(failed.length, 1);
  assert.equal(failed[0].conflicting, true);
  assert.equal(failed[0].needsUserAttention, true);
  // Conflicts are never silently treated as a clean change.
  assert.equal(snapshot.whatChanged.length, 0);
  const step = snapshot.suggestedNextSteps.find((s) => s.reason === "failed");
  assert.ok(step && step.text.includes("conflicting"));
}

// Irreversible failure ranks above everything else in next steps.
{
  const events = [
    evt({ kind: "failure", correlationId: "c-fail", summary: "Cancel flight booking.", affectedAreas: ["travel"], reversibility: "irreversible" }),
    evt({ kind: "request", correlationId: "c-wait", summary: "Add lunch with Sam.", affectedAreas: ["relationships"], actor: { kind: "user" }, verification: "self_reported" }),
  ];

  const snapshot = buildActivitySnapshot(events);
  assert.equal(snapshot.suggestedNextSteps[0].reason, "failed");
  assert.ok(snapshot.suggestedNextSteps[0].priority >= 100);
  assert.ok(snapshot.suggestedNextSteps[0].text.includes("can't be undone"));
}

// Revoked permission blocks an action and names the scope in the next step.
{
  const events = [
    evt({ kind: "request", correlationId: "c-revoked", summary: "Import bank transactions.", affectedAreas: ["finance"], source: { service: "finance", external: true, connectionId: "conn-1" } }),
    evt({ kind: "import", correlationId: "c-revoked", summary: "Import bank transactions.", affectedAreas: ["finance"], source: { service: "finance", external: true, connectionId: "conn-1" }, permission: { scope: "finance.read", state: "revoked" } }),
  ];

  const snapshot = buildActivitySnapshot(events);
  const blocked = findUnresolved(snapshot, "permission_revoked");
  assert.equal(blocked.length, 1);
  const step = snapshot.suggestedNextSteps.find((s) => s.reason === "permission_revoked");
  assert.ok(step && step.text.includes("finance.read"));
  // A blocked action did not change anything.
  assert.equal(snapshot.whatChanged.length, 0);
}

// Pending permission surfaces as its own unresolved reason.
{
  const events = [
    evt({ kind: "request", correlationId: "c-pending", summary: "Read your calendar.", permission: { scope: "calendar.read", state: "pending" } }),
  ];
  const snapshot = buildActivitySnapshot(events);
  assert.equal(findUnresolved(snapshot, "permission_pending").length, 1);
}

// Incomplete lifecycles map to the right unresolved reasons.
{
  const events = [
    evt({ kind: "request", correlationId: "c-await", summary: "Move gym to evening.", actor: { kind: "user" }, verification: "self_reported" }),
    evt({ kind: "approval", correlationId: "c-approved", summary: "Book haircut." }),
    evt({ kind: "execution", correlationId: "c-exec", summary: "Email the landlord." }),
  ];
  const snapshot = buildActivitySnapshot(events);
  assert.equal(findUnresolved(snapshot, "awaiting_approval").length, 1);
  assert.equal(findUnresolved(snapshot, "approved_not_executed").length, 1);
  assert.equal(findUnresolved(snapshot, "executed_no_result").length, 1);
  // None of these are "what happened" yet.
  assert.equal(snapshot.whatHappened.length, 0);
}

// Context access is something that happened, but changes nothing.
{
  const events = [
    evt({ kind: "context_access", correlationId: "c-read", summary: "Read your week to prepare the brief.", affectedAreas: ["calendar", "work"], reversibility: "reversible" }),
  ];
  const snapshot = buildActivitySnapshot(events);
  assert.equal(snapshot.whatHappened.length, 1);
  assert.equal(snapshot.whatHappened[0].readOnly, true);
  assert.equal(snapshot.whatChanged.length, 0);
  assert.deepEqual(snapshot.whatWasAffected, ["calendar", "work"]);
}

// Hidden events are excluded from lists but still counted.
{
  const events = [
    evt({ kind: "result", summary: "Visible change.", affectedAreas: ["work"] }),
    evt({ kind: "result", summary: "Internal bookkeeping.", visibility: "hidden", affectedAreas: ["work"] }),
  ];
  const snapshot = buildActivitySnapshot(events);
  assert.equal(snapshot.hiddenCount, 1);
  assert.equal(snapshot.whatHappened.length, 1);
  assert.equal(snapshot.consideredEvents, 1);
}

// A "completed" action with no confirmation is flagged as incomplete evidence.
{
  const events = [
    evt({ kind: "result", correlationId: "c-unsure", summary: "Maybe paid the electric bill.", affectedAreas: ["finance"], verification: "unverified", confidence: 0.2, reversibility: "irreversible" }),
  ];
  const snapshot = buildActivitySnapshot(events);
  const gap = findUnresolved(snapshot, "incomplete_evidence");
  assert.equal(gap.length, 1);
  assert.equal(gap[0].needsUserAttention, true); // irreversible => attention
}

// dateKey filtering keeps only events from the requested day.
{
  const events = [
    evt({ kind: "result", summary: "Today.", timestamp: "2026-09-01T10:00:00.000Z" }),
    evt({ kind: "result", summary: "Yesterday.", timestamp: "2026-08-31T10:00:00.000Z" }),
  ];
  const snapshot = buildActivitySnapshot(events, { dateKey: "2026-09-01" });
  assert.equal(snapshot.consideredEvents, 1);
  assert.equal(snapshot.whatHappened[0].summary, "Today.");
  assert.equal(snapshot.range.dateKey, "2026-09-01");
}

// A busy, mixed day still produces a coherent, prioritized snapshot.
{
  const day = "2026-09-01";
  const events = [
    // completed calendar add
    evt({ kind: "result", correlationId: "m1", summary: "Added school pickup.", affectedAreas: ["family", "calendar"], timestamp: `${day}T07:00:00.000Z`, verification: "source_confirmed" }),
    // failed reversible finance
    evt({ kind: "failure", correlationId: "m2", summary: "Auto-pay to gym failed.", affectedAreas: ["finance"], timestamp: `${day}T09:00:00.000Z` }),
    // awaiting approval
    evt({ kind: "request", correlationId: "m3", summary: "Reschedule dentist.", affectedAreas: ["health"], timestamp: `${day}T10:00:00.000Z`, actor: { kind: "user" }, verification: "self_reported" }),
    // duplicate of m1
    evt({ id: "dup-m1", kind: "result", correlationId: "m1", summary: "Added school pickup.", affectedAreas: ["family", "calendar"], timestamp: `${day}T07:00:00.000Z`, verification: "source_confirmed" }),
    // context read
    evt({ kind: "context_access", correlationId: "m4", summary: "Reviewed your finances.", affectedAreas: ["finance"], timestamp: `${day}T06:00:00.000Z` }),
  ];

  const snapshot = buildActivitySnapshot(events, { dateKey: day });

  // school pickup + gym failure + finance read = 3 happenings (dup removed).
  assert.equal(snapshot.whatHappened.length, 3);
  assert.deepEqual(snapshot.whatWasAffected, ["calendar", "family", "finance", "health"]);
  // Only the completed calendar/family add is a real change.
  const changedAreas = snapshot.whatChanged.map((c) => c.area).sort();
  assert.deepEqual(changedAreas, ["calendar", "family"]);
  // failed (80) should outrank awaiting_approval (70).
  assert.equal(snapshot.suggestedNextSteps[0].reason, "failed");
  assert.equal(snapshot.suggestedNextSteps[1].reason, "awaiting_approval");
}

console.log("activity-daily-snapshot tests passed");
