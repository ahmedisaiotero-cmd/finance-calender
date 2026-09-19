import assert from "node:assert/strict";
import { after, test } from "node:test";

import type { ActivityEventInput } from "@/lib/activity/activity-event";
import { appendActivityEvent } from "@/lib/activity/ledger";
import { createPrismaActivityEventStore } from "@/lib/db/activity-event-store";
import { createIsolatedPrismaClient } from "@/lib/db/isolated-prisma";

const prisma = createIsolatedPrismaClient();
const skip = !prisma;

function noteInput(partial: Partial<ActivityEventInput> = {}): ActivityEventInput {
  return {
    id: partial.id ?? `evt-ledger-${Date.now()}`,
    kind: partial.kind ?? "import",
    actor: partial.actor ?? { kind: "user" },
    source: partial.source ?? { service: "sync" },
    timestamp: partial.timestamp ?? "2026-09-19T18:00:00.000Z",
    affectedAreas: partial.affectedAreas ?? ["work"],
    summary: partial.summary ?? "Local ledger write",
    evidence: partial.evidence ?? [
      { kind: "system_log", description: "Isolated Postgres insert." },
    ],
    verification: partial.verification ?? "self_reported",
    confidence: partial.confidence ?? 0.8,
    reversibility: partial.reversibility ?? "reversible",
    permission: partial.permission ?? { scope: "ledger.write", state: "granted" },
    visibility: partial.visibility ?? "visible",
  };
}

after(async () => {
  await prisma?.$disconnect();
});

test("Prisma ledger insert and owner-scoped read on isolated Postgres", {
  skip,
}, async () => {
  if (!prisma) return;

  const user = await prisma.user.create({
    data: { email: `ledger-${Date.now()}@sync.test` },
  });
  const workspace = await prisma.workspace.create({
    data: { ownerId: user.id, name: "Ledger test" },
  });
  const owner = { userId: user.id, workspaceId: workspace.id };
  const store = createPrismaActivityEventStore(prisma);

  const first = await appendActivityEvent(
    {
      owner,
      event: noteInput({ id: `evt-${user.id}` }),
      idempotencyKey: `delivery-${user.id}`,
    },
    { store },
  );

  assert.equal(first.reused, false);
  assert.equal(first.record.event.verification, "self_reported");

  const replay = await appendActivityEvent(
    {
      owner,
      event: noteInput({
        id: `evt-replay-${user.id}`,
        summary: "Different summary should not create a second row",
      }),
      idempotencyKey: `delivery-${user.id}`,
    },
    { store },
  );
  assert.equal(replay.reused, true);
  assert.equal(replay.record.event.id, first.record.event.id);

  const otherUser = await prisma.user.create({
    data: { email: `other-${Date.now()}@sync.test` },
  });
  const stolen = await store.findById(
    { userId: otherUser.id, workspaceId: workspace.id },
    first.record.event.id,
  );
  assert.equal(stolen, null);
});
