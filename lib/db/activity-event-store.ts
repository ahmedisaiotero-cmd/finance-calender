/**
 * Prisma-backed ActivityEvent store.
 *
 * This is the only module allowed to call `activityEventRecord` writes.
 * It inserts and owner-scoped reads. It does not update or delete rows.
 */

import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  ActivityEventStore,
  ActivityOwner,
  PersistedActivityEvent,
} from "@/lib/activity/ledger-types";
import type { ActivityEvent } from "@/lib/activity/types";
import { prisma } from "@/lib/prisma";

type ActivityEventRow = {
  id: string;
  schemaVersion: number;
  userId: string;
  workspaceId: string;
  occurredAt: Date;
  recordedAt: Date;
  idempotencyKey: string;
  priorEventId: string | null;
  payload: Prisma.JsonValue;
};

function ownerWhere(owner: ActivityOwner) {
  return { workspaceId: owner.workspaceId, userId: owner.userId };
}

function toPersisted(row: ActivityEventRow): PersistedActivityEvent {
  return {
    schemaVersion: row.schemaVersion,
    userId: row.userId,
    workspaceId: row.workspaceId,
    occurredAt: row.occurredAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
    idempotencyKey: row.idempotencyKey,
    priorEventId: row.priorEventId,
    event: row.payload as unknown as ActivityEvent,
  };
}

function sourceRefFromEvent(event: ActivityEvent): string | null {
  const fromEvidence = event.evidence.find((item) => item.sourceRef)?.sourceRef;
  return fromEvidence ?? event.source.connectionId ?? null;
}

export function createPrismaActivityEventStore(
  client: PrismaClient,
): ActivityEventStore {
  return {
    async insert(record) {
      try {
        const row = await client.activityEventRecord.create({
          data: {
            id: record.event.id,
            schemaVersion: record.schemaVersion,
            userId: record.userId,
            workspaceId: record.workspaceId,
            kind: record.event.kind,
            verification: record.event.verification,
            actorKind: record.event.actor.kind,
            actorId: record.event.actor.id ?? null,
            sourceService: record.event.source.service,
            sourceConnectionId: record.event.source.connectionId ?? null,
            sourceExternal: Boolean(record.event.source.external),
            occurredAt: new Date(record.occurredAt),
            recordedAt: new Date(record.recordedAt),
            correlationId: record.event.correlationId ?? null,
            priorEventId: record.priorEventId,
            sourceRef: sourceRefFromEvent(record.event),
            idempotencyKey: record.idempotencyKey,
            payload: record.event as unknown as Prisma.InputJsonValue,
          },
        });
        return { record: toPersisted(row), reused: false };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const existing =
            (await client.activityEventRecord.findFirst({
              where: {
                ...ownerWhere({
                  userId: record.userId,
                  workspaceId: record.workspaceId,
                }),
                OR: [
                  { idempotencyKey: record.idempotencyKey },
                  { id: record.event.id },
                ],
              },
            })) ?? null;
          if (existing) {
            return { record: toPersisted(existing), reused: true };
          }
        }
        throw error;
      }
    },

    async findById(owner, id) {
      const row = await client.activityEventRecord.findFirst({
        where: { ...ownerWhere(owner), id },
      });
      return row ? toPersisted(row) : null;
    },

    async findByIdempotencyKey(owner, idempotencyKey) {
      const row = await client.activityEventRecord.findFirst({
        where: { ...ownerWhere(owner), idempotencyKey },
      });
      return row ? toPersisted(row) : null;
    },

    async list({ owner, limit, cursor }) {
      const rows = await client.activityEventRecord.findMany({
        where: {
          ...ownerWhere(owner),
          ...(cursor
            ? {
                OR: [
                  { recordedAt: { gt: new Date(cursor.recordedAt) } },
                  {
                    recordedAt: new Date(cursor.recordedAt),
                    id: { gt: cursor.id },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
        take: limit,
      });
      return rows.map(toPersisted);
    },
  };
}

export const prismaActivityEventStore = createPrismaActivityEventStore(prisma);
