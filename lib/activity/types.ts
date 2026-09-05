/**
 * Provider-neutral AI activity event contract.
 *
 * This is the foundation for Sync's permissioned AI activity + Passport layer.
 * It describes *what an AI action or data touch was* in a way that does not
 * assume any specific provider (calendar, email, finance, health, etc.).
 *
 * Design rules for this contract:
 * - It never stores raw secrets, provider tokens, or credentials. References to
 *   external systems are opaque ids only (see {@link ActivitySource.connectionId}
 *   and {@link ActivityEvidence.sourceRef}). Redaction lives in `redaction.ts`.
 * - It reuses shared Sync concepts. Affected areas are the canonical
 *   {@link LifeAreaId} values, not a new area taxonomy.
 * - It is pure data. No I/O, no network, no OAuth. Connectors added later
 *   translate their provider payloads *into* this contract.
 */

import type { LifeAreaId } from "@/lib/user-life-areas";

/**
 * The lifecycle stage an event represents.
 *
 * A single logical action typically produces several events sharing one
 * {@link ActivityEvent.correlationId}: `request` → `approval` → `execution` →
 * `result` | `failure`. `import` and `context_access` usually stand alone.
 */
export type ActivityEventKind =
  | "request" // Something (user or Sync) asked for an action to happen.
  | "approval" // A permission/approval decision was recorded for a request.
  | "execution" // An action actually started running.
  | "result" // An execution completed and produced an outcome.
  | "failure" // An attempt failed, was blocked, or errored.
  | "import" // Data was brought in from a source (read into Sync).
  | "context_access"; // Sync/AI read existing context (no state change).

/** Who or what originated the event. Never a credential. */
export type ActivityActorKind =
  | "user"
  | "sync" // Sync's own reasoning engine.
  | "assistant" // A conversational/AI surface acting on the user's behalf.
  | "connector" // A future permissioned integration.
  | "external_service"
  | "system";

export type ActivityActor = {
  kind: ActivityActorKind;
  /** Opaque, non-secret identifier (e.g. a connection id or user id). */
  id?: string | null;
  /** Human-readable label in Sync voice, e.g. "You", "Sync", "Calendar". */
  label?: string | null;
};

/**
 * Where the event came from. Provider-neutral: `service` is a stable slug the
 * app chooses (e.g. "manual", "calendar", "email", "finance", "health"), not a
 * vendor SDK name.
 */
export type ActivitySource = {
  service: string;
  /** Opaque reference to a permission grant / connection. NEVER a token. */
  connectionId?: string | null;
  /** True when the event originated outside manual capture. */
  external?: boolean;
};

/**
 * How strongly the event is backed by evidence.
 *
 * Ordering (weakest → strongest): unverified < self_reported < system_logged <
 * source_confirmed. This ordering is intentionally shared with Passport claims
 * so that a source-confirmed event can support a source-confirmed claim without
 * inventing verification the evidence does not justify.
 */
export type VerificationLevel =
  | "unverified" // No backing evidence at all.
  | "self_reported" // The user stated it.
  | "system_logged" // Sync recorded that it happened.
  | "source_confirmed"; // The source service confirmed it.

export const VERIFICATION_RANK: Record<VerificationLevel, number> = {
  unverified: 0,
  self_reported: 1,
  system_logged: 2,
  source_confirmed: 3,
};

/** How easily an action can be undone. Drives caution in suggested next steps. */
export type Reversibility =
  | "reversible"
  | "partially_reversible"
  | "irreversible"
  | "unknown";

export type PermissionState =
  | "not_required"
  | "pending" // Waiting on the user to grant.
  | "granted"
  | "denied"
  | "revoked" // Was granted, then taken away.
  | "expired"; // Lapsed and needs re-granting.

export type PermissionScope = {
  /** Provider-neutral scope slug, e.g. "calendar.read", "finance.write". */
  scope: string;
  state: PermissionState;
  grantedAt?: string | null;
  expiresAt?: string | null;
};

/** How much of the event Sync should show the user. */
export type UserVisibility =
  | "visible" // Safe to show in full.
  | "summary_only" // Show a summary, not detail.
  | "sensitive" // Show only with care; may be masked by default.
  | "hidden"; // Internal; not surfaced to the user.

export type ActivityEvidenceKind =
  | "user_statement"
  | "source_record"
  | "system_log"
  | "inference"
  | "external_document";

/**
 * A single piece of provenance. `description` is human-readable and must never
 * contain a raw secret. `sourceRef` is an opaque pointer (record id, message
 * id), never a token or URL with credentials.
 */
export type ActivityEvidence = {
  kind: ActivityEvidenceKind;
  description: string;
  sourceRef?: string | null;
  capturedAt?: string | null;
};

/**
 * The provider-neutral activity event.
 *
 * Every permissioned AI action, data import, or context read is expressed as
 * one or more of these. Downstream, {@link buildActivitySnapshot} turns a
 * stream of these into a calm daily snapshot.
 */
export type ActivityEvent = {
  id: string;
  kind: ActivityEventKind;
  actor: ActivityActor;
  source: ActivitySource;
  /** ISO-8601 timestamp of when the event occurred. */
  timestamp: string;
  /** Canonical life areas this event touched. Reuses shared taxonomy. */
  affectedAreas: LifeAreaId[];
  /** Short, calm, human-readable summary in Sync voice. Never a secret. */
  summary: string;
  evidence: ActivityEvidence[];
  verification: VerificationLevel;
  /** Model/heuristic confidence in [0, 1]. */
  confidence: number;
  reversibility: Reversibility;
  permission: PermissionScope;
  visibility: UserVisibility;
  /** Groups the events of a single logical action across its lifecycle. */
  correlationId?: string | null;
  relatedEventIds?: string[];
  /**
   * Optional structured, non-secret detail. Values are scalars only so the
   * contract cannot smuggle nested credential blobs.
   */
  detail?: Record<string, string | number | boolean | null>;
};
