/**
 * Append-only Activity evidence ledger.
 *
 * The only sanctioned write path: `createActivityEvent` then store.insert.
 * There is no update or delete on the normal event API. Confirmations and
 * corrections insert a new row that references the earlier event.
 */

import { createActivityEvent } from "@/lib/activity/activity-event";
import { looksLikeSecret } from "@/lib/activity/redaction";
import {
  ACTIVITY_EVENT_SCHEMA_VERSION,
  ACTIVITY_LEDGER_DEFAULT_LIMIT,
  ACTIVITY_LEDGER_MAX_LIMIT,
  ActivityLedgerError,
  PUBLIC_ACTIVITY_VERIFICATION_LEVELS,
  PRIVILEGED_ACTIVITY_VERIFICATION_LEVELS,
  isPublicActivityVerification,
  type ActivityEventStore,
  type ActivityLedgerCursor,
  type ActivityLedgerPage,
  type ActivityOwner,
  type AppendActivityEventInput,
  type AppendActivityEventResult,
  type PersistedActivityEvent,
} from "@/lib/activity/ledger-types";
import { trustedWorkspaceId } from "@/lib/auth/ownership";
import type { RequestIdentity } from "@/lib/auth/request-identity";

export {
  ACTIVITY_EVENT_SCHEMA_VERSION,
  ACTIVITY_LEDGER_DEFAULT_LIMIT,
  ACTIVITY_LEDGER_MAX_LIMIT,
  ActivityLedgerError,
  PUBLIC_ACTIVITY_VERIFICATION_LEVELS,
  PRIVILEGED_ACTIVITY_VERIFICATION_LEVELS,
  isPublicActivityVerification,
};

export type LedgerClock = () => Date;

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return ACTIVITY_LEDGER_DEFAULT_LIMIT;
  }
  const whole = Math.floor(limit);
  if (whole < 1) return 1;
  if (whole > ACTIVITY_LEDGER_MAX_LIMIT) return ACTIVITY_LEDGER_MAX_LIMIT;
  return whole;
}

export function ownerFromIdentity(
  identity: RequestIdentity,
  untrusted?: {
    workspaceId?: unknown;
    userId?: unknown;
    ownerId?: unknown;
    email?: unknown;
    headers?: Headers | Record<string, string | null | undefined>;
  },
): ActivityOwner {
  void untrusted;
  return {
    userId: identity.user.id,
    workspaceId: trustedWorkspaceId(identity, untrusted),
  };
}

export function encodeActivityCursor(cursor: ActivityLedgerCursor): string {
  return Buffer.from(`${cursor.recordedAt}|${cursor.id}`, "utf8").toString(
    "base64url",
  );
}

export function decodeActivityCursor(value: string | null | undefined): ActivityLedgerCursor | null {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const split = decoded.indexOf("|");
    if (split <= 0) return null;
    const recordedAt = decoded.slice(0, split);
    const id = decoded.slice(split + 1);
    if (!recordedAt || !id || Number.isNaN(Date.parse(recordedAt))) return null;
    return { recordedAt, id };
  } catch {
    return null;
  }
}

function assertIdempotencyKey(key: string) {
  if (!key || typeof key !== "string" || !key.trim()) {
    throw new ActivityLedgerError("invalid_idempotency_key", "idempotencyKey is required");
  }
  if (key.length > 200) {
    throw new ActivityLedgerError("invalid_idempotency_key", "idempotencyKey is too long");
  }
  if (looksLikeSecret(key)) {
    throw new ActivityLedgerError("invalid_idempotency_key", "idempotencyKey is not allowed");
  }
}

function assertPublicVerification(level: string) {
  if (!isPublicActivityVerification(level)) {
    throw new ActivityLedgerError(
      "privileged_verification",
      "This verification level cannot be set through the public activity route",
      403,
    );
  }
}

async function insertActivityEvent(
  input: AppendActivityEventInput,
  deps: { store: ActivityEventStore; now?: LedgerClock },
): Promise<AppendActivityEventResult> {
  assertIdempotencyKey(input.idempotencyKey);

  const related = new Set(input.event.relatedEventIds ?? []);
  let priorSnapshot: PersistedActivityEvent | null = null;
  if (input.priorEventId) {
    related.add(input.priorEventId);
    priorSnapshot = await deps.store.findById(input.owner, input.priorEventId);
    if (!priorSnapshot) {
      throw new ActivityLedgerError("prior_not_found", "Prior event was not found", 404);
    }
  }

  const event = createActivityEvent({
    ...input.event,
    relatedEventIds: related.size > 0 ? [...related] : input.event.relatedEventIds,
  });

  const recordedAt = (deps.now ?? (() => new Date()))().toISOString();
  const record: PersistedActivityEvent = {
    schemaVersion: ACTIVITY_EVENT_SCHEMA_VERSION,
    userId: input.owner.userId,
    workspaceId: input.owner.workspaceId,
    occurredAt: event.timestamp,
    recordedAt,
    idempotencyKey: input.idempotencyKey.trim(),
    priorEventId: input.priorEventId ?? null,
    event,
  };

  const inserted = await deps.store.insert(record);

  if (priorSnapshot) {
    const priorAfter = await deps.store.findById(input.owner, priorSnapshot.event.id);
    if (!priorAfter) {
      throw new ActivityLedgerError("prior_not_found", "Prior event was not found", 404);
    }
    if (priorAfter.event.verification !== priorSnapshot.event.verification) {
      throw new ActivityLedgerError(
        "append_only_violation",
        "Historical events cannot change verification",
        500,
      );
    }
  }

  return inserted;
}

/**
 * Public append path used by ordinary authenticated clients and `POST /api/activity`.
 * Rejects privileged verification levels instead of relabeling them.
 */
export async function appendActivityEvent(
  input: AppendActivityEventInput,
  deps: { store: ActivityEventStore; now?: LedgerClock },
): Promise<AppendActivityEventResult> {
  assertPublicVerification(input.event.verification);
  return insertActivityEvent(input, deps);
}

/**
 * Trusted server-side verifier path. Not imported by `POST /api/activity`.
 * Callers must already assert `source_confirmed`; this will not silently upgrade.
 */
export async function appendSourceConfirmedActivityEvent(
  input: AppendActivityEventInput,
  deps: { store: ActivityEventStore; now?: LedgerClock },
): Promise<AppendActivityEventResult> {
  if (input.event.verification !== "source_confirmed") {
    throw new ActivityLedgerError(
      "verifier_verification_required",
      "Trusted verifier writes must already use source_confirmed",
      400,
    );
  }
  return insertActivityEvent(input, deps);
}

export async function getActivityEvent(
  owner: ActivityOwner,
  id: string,
  store: ActivityEventStore,
): Promise<PersistedActivityEvent | null> {
  return store.findById(owner, id);
}

export async function listActivityEvents(
  input: {
    owner: ActivityOwner;
    limit?: number;
    cursor?: string | null;
  },
  store: ActivityEventStore,
): Promise<ActivityLedgerPage> {
  const limit = clampLimit(input.limit);
  const cursor = decodeActivityCursor(input.cursor ?? null);
  if (input.cursor && !cursor) {
    throw new ActivityLedgerError("invalid_cursor", "cursor is invalid");
  }

  const rows = await store.list({
    owner: input.owner,
    limit: limit + 1,
    cursor,
  });

  const hasMore = rows.length > limit;
  const records = hasMore ? rows.slice(0, limit) : rows;
  const last = records[records.length - 1];

  return {
    records,
    nextCursor:
      hasMore && last
        ? encodeActivityCursor({ recordedAt: last.recordedAt, id: last.event.id })
        : null,
  };
}

export function clampActivityLimit(limit: number | undefined): number {
  return clampLimit(limit);
}
