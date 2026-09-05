import assert from "node:assert/strict";

import {
  createActivityEvent,
  dedupeActivityEvents,
  normalizeActivityEvents,
} from "@/lib/activity/activity-event";
import { looksLikeSecret, redactSecrets, sanitizeDetail } from "@/lib/activity/redaction";
import type { ActivityEvent, ActivityEventInput } from "@/lib/activity";

function input(partial: Partial<ActivityEventInput> = {}): ActivityEventInput {
  return {
    id: partial.id ?? "evt-1",
    kind: partial.kind ?? "result",
    actor: partial.actor ?? { kind: "sync", label: "Sync" },
    source: partial.source ?? { service: "calendar" },
    timestamp: partial.timestamp ?? "2026-09-01T09:00:00.000Z",
    affectedAreas: partial.affectedAreas ?? ["calendar"],
    summary: partial.summary ?? "Added dentist appointment.",
    evidence: partial.evidence ?? [],
    verification: partial.verification ?? "system_logged",
    confidence: partial.confidence ?? 0.8,
    reversibility: partial.reversibility ?? "reversible",
    permission: partial.permission ?? { scope: "calendar.write", state: "granted" },
    visibility: partial.visibility ?? "visible",
    correlationId: partial.correlationId ?? null,
    relatedEventIds: partial.relatedEventIds,
    detail: partial.detail,
  };
}

// Redaction masks obvious credential material regardless of surrounding text.
{
  assert.equal(looksLikeSecret("just a normal calendar note"), false);
  assert.equal(
    looksLikeSecret("token is sk-ABCDEFGHIJKLMNOP1234567890"),
    true,
  );
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N";
  assert.equal(redactSecrets(jwt).includes("[redacted]"), true);
  assert.equal(redactSecrets("Authorization: Bearer abcdef1234567890XYZ").includes("[redacted]"), true);
}

// The factory never persists secrets and clamps/normalizes untrusted input.
{
  const event = createActivityEvent(
    input({
      summary: "Synced token sk-LIVE1234567890ABCDEFGHIJ into calendar",
      confidence: 4.2,
      affectedAreas: ["calendar", "calendar", "work"],
      evidence: [
        {
          kind: "source_record",
          description: "record ref Bearer abcdefghijklmnop1234",
          sourceRef: "AKIAIOSFODNN7EXAMPLE",
        },
      ],
      detail: {
        access_token: "sk-should-be-dropped-1234567890",
        note: "password is hunter2hunter2hunter2hunter2",
        count: 3,
      },
    }),
  );

  assert.equal(event.summary.includes("sk-LIVE1234567890"), false);
  assert.equal(event.summary.includes("[redacted]"), true);
  assert.equal(event.confidence, 1); // clamped from 4.2
  assert.deepEqual(event.affectedAreas, ["calendar", "work"]); // deduped
  assert.equal(event.evidence[0].description.includes("[redacted]"), true);
  assert.equal(event.detail?.access_token, "[redacted]"); // sensitive key dropped
  assert.equal(event.detail?.count, 3);
}

// Negative confidence clamps to 0; NaN becomes 0.
{
  assert.equal(createActivityEvent(input({ confidence: -1 })).confidence, 0);
  assert.equal(createActivityEvent(input({ confidence: Number.NaN })).confidence, 0);
}

// sanitizeDetail leaves clean scalars alone.
{
  assert.deepEqual(sanitizeDetail({ area: "calendar", n: 2, ok: true, empty: null }), {
    area: "calendar",
    n: 2,
    ok: true,
    empty: null,
  });
  assert.equal(sanitizeDetail(undefined), undefined);
}

// De-dupe removes both identical ids and re-delivered same-shape events.
{
  const a = createActivityEvent(input({ id: "dup", correlationId: "c1" }));
  const bSameId = createActivityEvent(input({ id: "dup", correlationId: "c1", summary: "different" }));
  const cSameShape = createActivityEvent(input({ id: "other", correlationId: "c1" }));
  const d = createActivityEvent(input({ id: "keep", correlationId: "c2", summary: "kept" }));

  const deduped = dedupeActivityEvents([a, bSameId, cSameShape, d]);
  const ids = deduped.map((e) => e.id).sort();
  assert.deepEqual(ids, ["dup", "keep"]);
}

// Normalization sorts chronologically and breaks ties by lifecycle stage.
{
  const ts = "2026-09-01T10:00:00.000Z";
  const result = createActivityEvent(input({ id: "r", kind: "result", timestamp: ts }));
  const request = createActivityEvent(input({ id: "q", kind: "request", timestamp: ts }));
  const earlier = createActivityEvent(input({ id: "e", kind: "result", timestamp: "2026-09-01T08:00:00.000Z" }));

  const ordered = normalizeActivityEvents([result, request, earlier]);
  assert.deepEqual(
    ordered.map((e) => e.id),
    ["e", "q", "r"],
  );
}

const _typecheck: ActivityEvent = createActivityEvent(input());
void _typecheck;

console.log("activity-event-contract tests passed");
