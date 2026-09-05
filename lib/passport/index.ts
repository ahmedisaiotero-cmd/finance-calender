/**
 * Passport claim layer.
 *
 * Distinguishes user-stated, account-linked, source-confirmed, and inferred
 * claims about the user, and reconciles them without fabricating trust.
 */

export * from "@/lib/passport/types";
export {
  reconcilePassportClaims,
  deriveClaimCandidatesFromEvents,
  basisForEvent,
  claimBasisAuthority,
  isVerifiedClaim,
  type ResolvedClaim,
  type ClaimConflict,
  type ClaimReconciliation,
} from "@/lib/passport/claims";
