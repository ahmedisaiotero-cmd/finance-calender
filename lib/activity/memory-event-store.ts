/**
 * In-memory ActivityEvent store for tests. Mirrors Prisma uniqueness and
 * owner scoping without a database.
 */

import type {
  ActivityEventStore,
  ActivityOwner,
  PersistedActivityEvent,
} from "@/lib/activity/ledger-types";

function belongsTo(record: PersistedActivityEvent, owner: ActivityOwner) {
  return (
    record.workspaceId === owner.workspaceId && record.userId === owner.userId
  );
}

export function createMemoryActivityEventStore(): ActivityEventStore {
  const byId = new Map<string, PersistedActivityEvent>();
  const byIdempotency = new Map<string, string>();

  return {
    async insert(record) {
      const idempotencyKey = `${record.workspaceId}|${record.userId}|${record.idempotencyKey}`;
      const existingId = byIdempotency.get(idempotencyKey);
      if (existingId) {
        const existing = byId.get(existingId);
        if (existing) return { record: existing, reused: true };
      }

      const existingById = byId.get(record.event.id);
      if (existingById) {
        if (belongsTo(existingById, {
          userId: record.userId,
          workspaceId: record.workspaceId,
        })) {
          return { record: existingById, reused: true };
        }
        throw new Error("Activity event id already exists for another owner");
      }

      byId.set(record.event.id, record);
      byIdempotency.set(idempotencyKey, record.event.id);
      return { record, reused: false };
    },

    async findById(owner, id) {
      const record = byId.get(id);
      if (!record || !belongsTo(record, owner)) return null;
      return record;
    },

    async findByIdempotencyKey(owner, idempotencyKey) {
      const id = byIdempotency.get(
        `${owner.workspaceId}|${owner.userId}|${idempotencyKey}`,
      );
      if (!id) return null;
      return this.findById(owner, id);
    },

    async list({ owner, limit, cursor }) {
      const rows = [...byId.values()]
        .filter((record) => belongsTo(record, owner))
        .sort(compareLedgerOrder);

      const start = cursor
        ? rows.findIndex(
            (record) =>
              compareLedgerOrder(record, {
                recordedAt: cursor.recordedAt,
                event: { id: cursor.id },
              } as PersistedActivityEvent) > 0,
          )
        : 0;

      const from = start < 0 ? rows.length : start;
      return rows.slice(from, from + limit);
    },
  };
}

export function compareLedgerOrder(
  a: Pick<PersistedActivityEvent, "recordedAt"> & { event: { id: string } },
  b: Pick<PersistedActivityEvent, "recordedAt"> & { event: { id: string } },
) {
  if (a.recordedAt !== b.recordedAt) {
    return a.recordedAt < b.recordedAt ? -1 : 1;
  }
  if (a.event.id !== b.event.id) {
    return a.event.id < b.event.id ? -1 : 1;
  }
  return 0;
}
