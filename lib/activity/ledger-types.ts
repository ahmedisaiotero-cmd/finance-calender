/**
 * Persistence envelope for the Activity evidence ledger.
 *
 * Domain events stay {@link ActivityEvent}. This file adds owner, times,
 * schema version, idempotency, and prior-event linkage required to store
 * them without inventing a second event model.
 */

import type { ActivityEvent, VerificationLevel } from "@/lib/activity/types";
import type { ActivityEventInput } from "@/lib/activity/activity-event";

export const ACTIVITY_EVENT_SCHEMA_VERSION = 1;

export const ACTIVITY_LEDGER_DEFAULT_LIMIT = 20;
export const ACTIVITY_LEDGER_MAX_LIMIT = 50;

export type ActivityOwner = {
  userId: string;
  workspaceId: string;
};

export type PersistedActivityEvent = {
  schemaVersion: number;
  userId: string;
  workspaceId: string;
  /** Domain `timestamp` — when the source says it happened. */
  occurredAt: string;
  /** Server-controlled insert time. */
  recordedAt: string;
  idempotencyKey: string;
  priorEventId: string | null;
  event: ActivityEvent;
};

export type AppendActivityEventInput = {
  owner: ActivityOwner;
  /** Raw domain input. Always passed through `createActivityEvent` before storage. */
  event: ActivityEventInput;
  idempotencyKey: string;
  /** Linked earlier event for confirmation, correction, or reversal. Not mutated. */
  priorEventId?: string | null;
};

export type AppendActivityEventResult = {
  record: PersistedActivityEvent;
  reused: boolean;
};

export type ActivityLedgerPage = {
  records: PersistedActivityEvent[];
  nextCursor: string | null;
};

export type ActivityEventStore = {
  insert(record: PersistedActivityEvent): Promise<{
    record: PersistedActivityEvent;
    reused: boolean;
  }>;
  findById(
    owner: ActivityOwner,
    id: string,
  ): Promise<PersistedActivityEvent | null>;
  findByIdempotencyKey(
    owner: ActivityOwner,
    idempotencyKey: string,
  ): Promise<PersistedActivityEvent | null>;
  list(input: {
    owner: ActivityOwner;
    limit: number;
    cursor?: ActivityLedgerCursor | null;
  }): Promise<PersistedActivityEvent[]>;
};

export type ActivityLedgerCursor = {
  recordedAt: string;
  id: string;
};

/** Ordinary users and agents may submit only these levels. */
export const PUBLIC_ACTIVITY_VERIFICATION_LEVELS = [
  "unverified",
  "self_reported",
] as const satisfies readonly VerificationLevel[];

/** Only trusted server paths may create these levels. */
export const PRIVILEGED_ACTIVITY_VERIFICATION_LEVELS = [
  "system_logged",
  "source_confirmed",
] as const satisfies readonly VerificationLevel[];

export type PublicActivityVerification =
  (typeof PUBLIC_ACTIVITY_VERIFICATION_LEVELS)[number];

export function isPublicActivityVerification(
  level: string,
): level is PublicActivityVerification {
  return (PUBLIC_ACTIVITY_VERIFICATION_LEVELS as readonly string[]).includes(
    level,
  );
}

export class ActivityLedgerError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ActivityLedgerError";
    this.code = code;
    this.status = status;
  }
}
