/**
 * Pure Passport claim reasoning.
 *
 * Reconciles a set of claims about the user without ever fabricating trust: a
 * claim's basis and verification are never upgraded here. Reconciliation only
 * *selects* the best-supported claim per subject and surfaces conflicts for the
 * user to resolve. It also shows where future connectors attach, via
 * {@link deriveClaimCandidatesFromEvents}, which mints candidate claims from
 * activity events at the basis the evidence actually supports.
 */

import type { ActivityEvent, VerificationLevel } from "@/lib/activity/types";
import { VERIFICATION_RANK } from "@/lib/activity/types";
import {
  CLAIM_BASIS_RANK,
  type PassportClaim,
  type PassportClaimBasis,
} from "@/lib/passport/types";

/** Statuses that no longer participate in the user's live Passport. */
const INACTIVE_STATUSES = new Set(["revoked", "expired"]);

export type ResolvedClaim = {
  subject: string;
  value: string;
  /** The winning claim for this subject. */
  claim: PassportClaim;
  basis: PassportClaimBasis;
  verification: VerificationLevel;
  confidence: number;
  /** Same-value claims from other bases/sources that corroborate the winner. */
  corroborations: PassportClaim[];
  /** Active claims for the same subject with a *different* value. */
  conflicts: PassportClaim[];
  conflicting: boolean;
};

export type ClaimConflict = {
  subject: string;
  claims: PassportClaim[];
};

export type ClaimReconciliation = {
  resolved: ResolvedClaim[];
  conflicts: ClaimConflict[];
};

export function claimBasisAuthority(basis: PassportClaimBasis): number {
  return CLAIM_BASIS_RANK[basis];
}

/**
 * A claim is only "verified" when it is both source-confirmed in basis and in
 * verification. This guard exists so surfaces never present a user-stated or
 * inferred claim as verified.
 */
export function isVerifiedClaim(claim: PassportClaim): boolean {
  return claim.basis === "source_confirmed" && claim.verification === "source_confirmed";
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function claimTime(claim: PassportClaim): number {
  const t = Date.parse(claim.updatedAt ?? claim.assertedAt);
  return Number.isNaN(t) ? 0 : t;
}

/** Higher is stronger. Basis first, then verification, recency, confidence. */
function claimStrength(claim: PassportClaim): number {
  return (
    CLAIM_BASIS_RANK[claim.basis] * 1_000_000 +
    VERIFICATION_RANK[claim.verification] * 100_000 +
    Math.min(claimTime(claim) / 1000, 90_000) +
    claim.confidence * 10
  );
}

function pickWinner(claims: PassportClaim[]): PassportClaim {
  return [...claims].sort((a, b) => claimStrength(b) - claimStrength(a))[0];
}

/**
 * Reconcile claims by subject. Same-subject claims with the same value
 * corroborate each other; differing values are conflicts. The winner is the
 * strongest-supported claim, but its basis/verification are preserved as-is.
 */
export function reconcilePassportClaims(claims: PassportClaim[]): ClaimReconciliation {
  const active = claims.filter((claim) => !INACTIVE_STATUSES.has(claim.status));

  const bySubject = new Map<string, PassportClaim[]>();
  for (const claim of active) {
    const key = normalize(claim.subject);
    const list = bySubject.get(key) ?? [];
    list.push(claim);
    bySubject.set(key, list);
  }

  const resolved: ResolvedClaim[] = [];
  const conflicts: ClaimConflict[] = [];

  for (const list of bySubject.values()) {
    const winner = pickWinner(list);
    const winnerValue = normalize(winner.value);

    const corroborations = list.filter(
      (claim) => claim.id !== winner.id && normalize(claim.value) === winnerValue,
    );
    const conflictClaims = list.filter(
      (claim) => normalize(claim.value) !== winnerValue,
    );

    if (conflictClaims.length > 0) {
      conflicts.push({ subject: winner.subject, claims: [winner, ...conflictClaims] });
    }

    resolved.push({
      subject: winner.subject,
      value: winner.value,
      claim: winner,
      basis: winner.basis,
      verification: winner.verification,
      confidence: winner.confidence,
      corroborations,
      conflicts: conflictClaims,
      conflicting: conflictClaims.length > 0,
    });
  }

  resolved.sort((a, b) => a.subject.localeCompare(b.subject));
  return { resolved, conflicts };
}

/**
 * Determine the claim basis an activity event can honestly support. Never
 * returns a stronger basis than the event's own evidence justifies.
 */
export function basisForEvent(event: ActivityEvent): PassportClaimBasis {
  if (event.verification === "source_confirmed") return "source_confirmed";
  if (event.source.external && event.source.connectionId) return "account_linked";
  if (event.actor.kind === "user" || event.verification === "self_reported") {
    return "user_stated";
  }
  return "inferred";
}

/**
 * Turn activity events into candidate Passport claims. Only events that carry
 * explicit `claimSubject` + `claimValue` detail produce candidates, so nothing
 * is fabricated. This is the seam where permissioned connectors will attach:
 * they emit source-confirmed events, which become source-confirmed claims.
 */
export function deriveClaimCandidatesFromEvents(
  events: ActivityEvent[],
): PassportClaim[] {
  const candidates: PassportClaim[] = [];

  for (const event of events) {
    const subject = event.detail?.claimSubject;
    const value = event.detail?.claimValue;
    if (typeof subject !== "string" || typeof value !== "string") continue;
    if (!subject.trim() || !value.trim()) continue;

    const permissionGone =
      event.permission.state === "revoked" || event.permission.state === "expired";

    candidates.push({
      id: `claim:${event.id}`,
      subject,
      value,
      basis: basisForEvent(event),
      status: permissionGone ? "revoked" : event.verification === "unverified" ? "unverified" : "active",
      areas: event.affectedAreas,
      confidence: event.confidence,
      verification: event.verification,
      evidence: event.evidence,
      source: event.source,
      assertedAt: event.timestamp,
      visibility: event.visibility,
    });
  }

  return candidates;
}
