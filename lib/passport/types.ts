/**
 * Passport claim contract.
 *
 * A Passport claim is something Sync believes to be true *about the user*
 * (e.g. "works at Acme", "lives in Lisbon", "has a gym membership"). The point
 * of this contract is to make the *basis* of every claim explicit so Sync never
 * presents an inference or a self-report as if a source confirmed it.
 *
 * It reuses the activity layer's verification, evidence, source, and visibility
 * types so a source-confirmed event can support a source-confirmed claim
 * without inventing trust the evidence does not justify.
 */

import type {
  ActivityEvidence,
  ActivitySource,
  UserVisibility,
  VerificationLevel,
} from "@/lib/activity/types";
import type { LifeAreaId } from "@/lib/user-life-areas";

/**
 * How a claim came to be known. This is the core distinction the pivot needs:
 *   - user_stated: the user told Sync directly.
 *   - account_linked: a linked account/connection implies it.
 *   - source_confirmed: an external source explicitly confirmed it.
 *   - inferred: Sync derived it from patterns or other evidence.
 */
export type PassportClaimBasis =
  | "user_stated"
  | "account_linked"
  | "source_confirmed"
  | "inferred";

/** Relative authority of a basis when reconciling conflicting claims. */
export const CLAIM_BASIS_RANK: Record<PassportClaimBasis, number> = {
  source_confirmed: 3,
  account_linked: 2,
  user_stated: 1,
  inferred: 0,
};

export type PassportClaimStatus =
  | "active"
  | "disputed" // Conflicting claims exist for the same subject.
  | "revoked" // The user withdrew it, or its permission was revoked.
  | "expired" // Time-bound and lapsed.
  | "unverified"; // Recorded but not yet backed by any evidence.

export type PassportClaim = {
  id: string;
  /** What the claim is about, e.g. "employer", "home city". Never a secret. */
  subject: string;
  /** The claimed value, e.g. "Acme", "Lisbon". Never a secret or token. */
  value: string;
  basis: PassportClaimBasis;
  status: PassportClaimStatus;
  areas: LifeAreaId[];
  /** Confidence in [0, 1]. */
  confidence: number;
  /** Verification level, shared with the activity layer. Never upgraded. */
  verification: VerificationLevel;
  evidence: ActivityEvidence[];
  source?: ActivitySource | null;
  assertedAt: string;
  updatedAt?: string | null;
  expiresAt?: string | null;
  visibility: UserVisibility;
  /** The claim this one replaces, if it is a correction/update. */
  supersedesClaimId?: string | null;
};
