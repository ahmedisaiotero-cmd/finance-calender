import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  ActivityLedgerError,
  appendActivityEvent,
  appendSourceConfirmedActivityEvent,
  clampActivityLimit,
  decodeActivityCursor,
  encodeActivityCursor,
  getActivityEvent,
  listActivityEvents,
  ownerFromIdentity,
  PUBLIC_ACTIVITY_VERIFICATION_LEVELS,
} from "@/lib/activity/ledger";
import { ACTIVITY_EVENT_SCHEMA_VERSION } from "@/lib/activity/ledger-types";
import { createMemoryActivityEventStore } from "@/lib/activity/memory-event-store";
import type { ActivityEventInput } from "@/lib/activity/activity-event";
import { trustedWorkspaceId } from "@/lib/auth/ownership";

function eventInput(partial: Partial<ActivityEventInput> = {}): ActivityEventInput {
  return {
    id: partial.id ?? "evt-1",
    kind: partial.kind ?? "result",
    actor: partial.actor ?? { kind: "assistant", id: "cursor", label: "Cursor" },
    source: partial.source ?? { service: "cursor", connectionId: "conn-1", external: true },
    timestamp: partial.timestamp ?? "2026-09-01T09:00:00.000Z",
    affectedAreas: partial.affectedAreas ?? ["work"],
    summary: partial.summary ?? "Ran the test suite.",
    evidence: partial.evidence ?? [
      { kind: "system_log", description: "Agent reported tests passed." },
    ],
    verification: partial.verification ?? "self_reported",
    confidence: partial.confidence ?? 0.7,
    reversibility: partial.reversibility ?? "reversible",
    permission: partial.permission ?? { scope: "repo.read", state: "granted" },
    visibility: partial.visibility ?? "visible",
    correlationId: partial.correlationId ?? "corr-1",
    relatedEventIds: partial.relatedEventIds,
    detail: partial.detail,
  };
}

const ownerA = { userId: "user-a", workspaceId: "ws-a" };
const ownerB = { userId: "user-b", workspaceId: "ws-b" };

function clockFrom(iso: string) {
  return () => new Date(iso);
}

async function main() {
  // Round-trip preserves domain semantics.
  {
    const store = createMemoryActivityEventStore();
    const { record, reused } = await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput(),
        idempotencyKey: "delivery-1",
      },
      { store, now: clockFrom("2026-09-15T18:00:00.000Z") },
    );
    assert.equal(reused, false);
    assert.equal(record.schemaVersion, ACTIVITY_EVENT_SCHEMA_VERSION);
    assert.equal(record.event.kind, "result");
    assert.equal(record.event.verification, "self_reported");
    assert.equal(record.event.timestamp, "2026-09-01T09:00:00.000Z");
    assert.equal(record.occurredAt, record.event.timestamp);
    assert.equal(record.recordedAt, "2026-09-15T18:00:00.000Z");
    assert.notEqual(record.occurredAt, record.recordedAt);

    const loaded = await getActivityEvent(ownerA, "evt-1", store);
    assert.deepEqual(loaded?.event, record.event);
    assert.equal(loaded?.userId, ownerA.userId);
    assert.equal(loaded?.workspaceId, ownerA.workspaceId);
  }

  // Ordinary clients cannot manufacture source_confirmed or system_logged.
  {
    const store = createMemoryActivityEventStore();
    await assert.rejects(
      () =>
        appendActivityEvent(
          {
            owner: ownerA,
            event: eventInput({
              id: "evt-spoof",
              verification: "source_confirmed",
              summary: "I swear GitHub passed.",
            }),
            idempotencyKey: "spoof-1",
          },
          { store, now: clockFrom("2026-09-15T18:00:30.000Z") },
        ),
      (error: unknown) =>
        error instanceof ActivityLedgerError &&
        error.code === "privileged_verification" &&
        error.status === 403,
    );
    await assert.rejects(
      () =>
        appendActivityEvent(
          {
            owner: ownerA,
            event: eventInput({
              id: "evt-spoof-logged",
              verification: "system_logged",
            }),
            idempotencyKey: "spoof-2",
          },
          { store, now: clockFrom("2026-09-15T18:00:31.000Z") },
        ),
      (error: unknown) =>
        error instanceof ActivityLedgerError && error.code === "privileged_verification",
    );
    assert.equal(await getActivityEvent(ownerA, "evt-spoof", store), null);
    const page = await listActivityEvents({ owner: ownerA, limit: 50 }, store);
    assert.equal(page.records.length, 0);

    await assert.rejects(
      () =>
        appendSourceConfirmedActivityEvent(
          {
            owner: ownerA,
            event: eventInput({
              id: "evt-relabel",
              verification: "self_reported",
            }),
            idempotencyKey: "relabel-1",
          },
          { store, now: clockFrom("2026-09-15T18:00:32.000Z") },
        ),
      (error: unknown) =>
        error instanceof ActivityLedgerError &&
        error.code === "verifier_verification_required",
    );
  }

  // Secrets are redacted before the store sees the payload.
  {
    const seen: string[] = [];
    const inner = createMemoryActivityEventStore();
    const store = {
      ...inner,
      async insert(record: Awaited<ReturnType<typeof inner.insert>>["record"]) {
        seen.push(JSON.stringify(record.event));
        return inner.insert(record);
      },
    };
    await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput({
          id: "evt-secret",
          summary: "Stored token sk-LIVE1234567890ABCDEFGHIJ",
          detail: { access_token: "super-secret-token-value-123456", note: "ok" },
        }),
        idempotencyKey: "secret-delivery",
      },
      { store, now: clockFrom("2026-09-15T18:01:00.000Z") },
    );
    assert.equal(seen.length, 1);
    assert.equal(seen[0].includes("sk-LIVE1234567890"), false);
    assert.equal(seen[0].includes("[redacted]"), true);
  }

  // Duplicate idempotency identity does not create a second event or upgrade verification.
  {
    const store = createMemoryActivityEventStore();
    const first = await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput({ id: "evt-dup", verification: "self_reported" }),
        idempotencyKey: "same-delivery",
      },
      { store, now: clockFrom("2026-09-15T18:02:00.000Z") },
    );
    const second = await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput({
          id: "evt-dup",
          verification: "self_reported",
          summary: "GitHub said tests passed.",
        }),
        idempotencyKey: "same-delivery",
      },
      { store, now: clockFrom("2026-09-15T18:03:00.000Z") },
    );
    assert.equal(second.reused, true);
    assert.equal(second.record.event.verification, "self_reported");
    assert.equal(second.record.event.summary, first.record.event.summary);
    const page = await listActivityEvents({ owner: ownerA, limit: 50 }, store);
    assert.equal(page.records.filter((row) => row.event.id === "evt-dup").length, 1);
  }

  // Source confirmation is a new linked event; the original is unchanged.
  {
    const store = createMemoryActivityEventStore();
    const reported = await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput({
          id: "evt-report",
          kind: "result",
          actor: { kind: "assistant", id: "cursor", label: "Cursor" },
          verification: "self_reported",
          summary: "Agent reported tests passed.",
        }),
        idempotencyKey: "report-1",
      },
      { store, now: clockFrom("2026-09-15T18:04:00.000Z") },
    );

    const confirmed = await appendSourceConfirmedActivityEvent(
      {
        owner: ownerA,
        event: eventInput({
          id: "evt-confirm",
          kind: "result",
          actor: { kind: "external_service", id: "github", label: "GitHub" },
          source: { service: "github", connectionId: "gh-1", external: true },
          verification: "source_confirmed",
          summary: "GitHub checks passed.",
          correlationId: "corr-1",
        }),
        idempotencyKey: "confirm-1",
        priorEventId: reported.record.event.id,
      },
      { store, now: clockFrom("2026-09-15T18:05:00.000Z") },
    );

    assert.equal(confirmed.reused, false);
    assert.equal(confirmed.record.priorEventId, "evt-report");
    assert.equal(confirmed.record.event.verification, "source_confirmed");
    assert.ok(confirmed.record.event.relatedEventIds?.includes("evt-report"));

    const original = await getActivityEvent(ownerA, "evt-report", store);
    assert.equal(original?.event.verification, "self_reported");
    assert.equal(original?.event.summary, "Agent reported tests passed.");
    assert.equal(original?.recordedAt, reported.record.recordedAt);
  }

  // Corrections insert a new event and leave the original row intact.
  {
    const store = createMemoryActivityEventStore();
    await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput({
          id: "evt-wrong",
          summary: "Opened the wrong pull request.",
        }),
        idempotencyKey: "wrong-1",
      },
      { store, now: clockFrom("2026-09-15T18:06:00.000Z") },
    );
    await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput({
          id: "evt-fix",
          summary: "Corrected: opened PR #12.",
        }),
        idempotencyKey: "fix-1",
        priorEventId: "evt-wrong",
      },
      { store, now: clockFrom("2026-09-15T18:07:00.000Z") },
    );
    const original = await getActivityEvent(ownerA, "evt-wrong", store);
    assert.equal(original?.event.summary, "Opened the wrong pull request.");
    const fix = await getActivityEvent(ownerA, "evt-fix", store);
    assert.equal(fix?.priorEventId, "evt-wrong");
  }

  // Cross-owner reads are rejected.
  {
    const store = createMemoryActivityEventStore();
    await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput({ id: "evt-private", summary: "Private receipt." }),
        idempotencyKey: "private-a",
      },
      { store, now: clockFrom("2026-09-15T18:08:00.000Z") },
    );
    assert.equal(await getActivityEvent(ownerB, "evt-private", store), null);
    const page = await listActivityEvents({ owner: ownerB, limit: 50 }, store);
    assert.equal(page.records.length, 0);
  }

  // Client identity fields cannot override the trusted owner.
  {
    const identity = {
      mode: "authenticated" as const,
      user: { id: "user-trusted", email: "a@example.com", name: "A" },
      workspace: { id: "ws-trusted", name: "Personal" },
    };
    assert.deepEqual([...PUBLIC_ACTIVITY_VERIFICATION_LEVELS], [
      "unverified",
      "self_reported",
    ]);

    const owner = ownerFromIdentity(identity, {
      userId: "user-attacker",
      workspaceId: "ws-attacker",
      ownerId: "owner-attacker",
      headers: {
        "x-workspace-id": "ws-header-attacker",
        "x-user-id": "user-header-attacker",
      },
    });
    assert.equal(owner.userId, "user-trusted");
    assert.equal(owner.workspaceId, "ws-trusted");
    assert.equal(
      trustedWorkspaceId(identity, { workspaceId: "ws-attacker" }),
      "ws-trusted",
    );
  }

  // Pagination is bounded and deterministically ordered by recordedAt, then id.
  {
    const store = createMemoryActivityEventStore();
    for (const [id, recordedAt] of [
      ["evt-c", "2026-09-15T18:10:00.000Z"],
      ["evt-a", "2026-09-15T18:09:00.000Z"],
      ["evt-b", "2026-09-15T18:09:00.000Z"],
    ] as const) {
      await appendActivityEvent(
        {
          owner: ownerA,
          event: eventInput({ id, summary: id }),
          idempotencyKey: `page-${id}`,
        },
        { store, now: clockFrom(recordedAt) },
      );
    }
    const first = await listActivityEvents({ owner: ownerA, limit: 2 }, store);
    assert.deepEqual(
      first.records.map((row) => row.event.id),
      ["evt-a", "evt-b"],
    );
    assert.ok(first.nextCursor);
    const second = await listActivityEvents(
      { owner: ownerA, limit: 2, cursor: first.nextCursor },
      store,
    );
    assert.deepEqual(
      second.records.map((row) => row.event.id),
      ["evt-c"],
    );
    assert.equal(second.nextCursor, null);
    assert.equal(clampActivityLimit(999), 50);
    assert.equal(clampActivityLimit(0), 1);
    const roundTrip = decodeActivityCursor(
      encodeActivityCursor({ recordedAt: "2026-09-15T18:09:00.000Z", id: "evt-a" }),
    );
    assert.deepEqual(roundTrip, {
      recordedAt: "2026-09-15T18:09:00.000Z",
      id: "evt-a",
    });
  }

  // Idempotency is per owner, not shared across users in a workspace.
  {
    const store = createMemoryActivityEventStore();
    await appendActivityEvent(
      {
        owner: ownerA,
        event: eventInput({ id: "evt-a-key", summary: "A's receipt." }),
        idempotencyKey: "shared-key",
      },
      { store, now: clockFrom("2026-09-15T18:12:00.000Z") },
    );
    const other = { userId: "user-a2", workspaceId: "ws-a" };
    const second = await appendActivityEvent(
      {
        owner: other,
        event: eventInput({ id: "evt-a2-key", summary: "Other user's receipt." }),
        idempotencyKey: "shared-key",
      },
      { store, now: clockFrom("2026-09-15T18:13:00.000Z") },
    );
    assert.equal(second.reused, false);
    assert.equal(await getActivityEvent(ownerA, "evt-a2-key", store), null);
  }
  {
    const store = createMemoryActivityEventStore();
    await assert.rejects(
      () =>
        appendActivityEvent(
          {
            owner: ownerA,
            event: eventInput({ id: "evt-orphan" }),
            idempotencyKey: "orphan-1",
            priorEventId: "does-not-exist",
          },
          { store, now: clockFrom("2026-09-15T18:11:00.000Z") },
        ),
      (error: unknown) =>
        error instanceof Error && error.message.includes("Prior event"),
    );
  }

  // Prisma ActivityEventRecord writes are confined to the ledger store.
  {
    const roots = ["lib", "app", "components"];
    const hits: string[] = [];

    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const stat = statSync(full);
        if (stat.isDirectory()) {
          if (name === "node_modules" || name === ".next") continue;
          walk(full);
          continue;
        }
        if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue;
        const source = readFileSync(full, "utf8");
        if (!source.includes("activityEventRecord")) continue;
        hits.push(relative(process.cwd(), full).replaceAll("\\", "/"));
      }
    };
    for (const root of roots) walk(root);
    assert.deepEqual(hits, ["lib/db/activity-event-store.ts"]);

    const storeSource = readFileSync(
      join(process.cwd(), "lib/db/activity-event-store.ts"),
      "utf8",
    );
    assert.equal(storeSource.includes(".update("), false);
    assert.equal(storeSource.includes(".delete("), false);
    assert.equal(storeSource.includes(".deleteMany("), false);
    assert.equal(storeSource.includes("captured-items"), false);

    const ledgerSource = readFileSync(join(process.cwd(), "lib/activity/ledger.ts"), "utf8");
    assert.equal(ledgerSource.includes("createActivityEvent"), true);
    assert.equal(ledgerSource.includes("sync-connections"), false);
    assert.equal(ledgerSource.includes("/api/chat"), false);

    const routeSource = readFileSync(join(process.cwd(), "app/api/activity/route.ts"), "utf8");
    assert.equal(routeSource.includes("appendActivityEvent"), true);
    assert.equal(routeSource.includes("appendSourceConfirmedActivityEvent"), false);

    const migration = readFileSync(
      join(process.cwd(), "prisma/migrations/20260915000000_activity_event_ledger/migration.sql"),
      "utf8",
    );
    assert.match(migration, /"userId" TEXT NOT NULL/);
    assert.match(migration, /"workspaceId" TEXT NOT NULL/);
    assert.match(migration, /"idempotencyKey" TEXT NOT NULL/);
    assert.match(
      migration,
      /UNIQUE INDEX "ActivityEventRecord_workspaceId_userId_idempotencyKey_key"/,
    );
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    assert.match(schema, /@@unique\(\[workspaceId, userId, idempotencyKey\]\)/);
  }

  console.log("activity-event-ledger tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
