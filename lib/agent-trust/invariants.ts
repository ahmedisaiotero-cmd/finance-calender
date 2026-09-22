/**
 * Pure invariants for agent-trust objects. No I/O.
 */

import { PRIVILEGED_ACTIVITY_VERIFICATION_LEVELS } from "@/lib/activity/ledger-types";
import type { VerificationLevel } from "@/lib/activity/types";
import type {
  ActivityReceipt,
  AdapterSupportState,
  AgentCard,
  AgentIdentity,
  Connection,
  ConnectionStatus,
  ContextPackage,
  Delegation,
  IdentityAssuranceTier,
  OwnerRef,
  PermissionAction,
  PermissionGrant,
  PrincipalIdentity,
} from "@/lib/agent-trust/types";

export function sameOwner(a: OwnerRef, b: OwnerRef): boolean {
  return a.userId === b.userId && a.workspaceId === b.workspaceId;
}

export function assertOwnerMatch(expected: OwnerRef, actual: OwnerRef): void {
  if (!sameOwner(expected, actual)) {
    throw new Error("owner_mismatch");
  }
}

const TIER_RANK: Record<IdentityAssuranceTier, number> = {
  account_verified: 0,
  self_attested: 1,
  source_linked: 2,
  identity_proofed: 3,
};

export function identityTierRank(tier: IdentityAssuranceTier): number {
  return TIER_RANK[tier];
}

/** Client-supplied higher tiers are ignored. Server must set upgrades. */
export function rejectClientIdentityUpgrade(
  current: IdentityAssuranceTier,
  requested: IdentityAssuranceTier,
): IdentityAssuranceTier {
  if (identityTierRank(requested) > identityTierRank(current)) {
    throw new Error("implicit_identity_upgrade");
  }
  return requested;
}

export function isGrantActive(grant: PermissionGrant, nowIso: string): boolean {
  if (grant.revokedAt) return false;
  return Date.parse(grant.expiresAt) > Date.parse(nowIso);
}

export function grantAllows(
  grant: PermissionGrant,
  action: PermissionAction,
  nowIso: string,
): boolean {
  return isGrantActive(grant, nowIso) && grant.actions.includes(action);
}

/** Narrowing is allowed; adding actions or extending expiry is not. */
export function narrowGrant(
  grant: PermissionGrant,
  nextActions: PermissionAction[],
  nextExpiresAt: string,
): PermissionGrant {
  if (nextActions.some((action) => !grant.actions.includes(action))) {
    throw new Error("implicit_privilege_upgrade");
  }
  if (Date.parse(nextExpiresAt) > Date.parse(grant.expiresAt)) {
    throw new Error("implicit_privilege_upgrade");
  }
  return { ...grant, actions: nextActions, expiresAt: nextExpiresAt };
}

export function assertDelegationDefaults(delegation: Delegation): void {
  if (delegation.redelegationAllowed) {
    throw new Error("redelegation_not_default");
  }
  if (delegation.depth !== 0) {
    throw new Error("redelegation_not_default");
  }
}

export function publicAgentCardHasNoSecrets(card: AgentCard): boolean {
  const blob = JSON.stringify(card).toLowerCase();
  return !/(token|secret|password|bearer|private[_-]?key|authorization)/i.test(
    blob,
  );
}

export function connectionShowsInSync(input: {
  principal: PrincipalIdentity;
  connection: Connection;
  grant: PermissionGrant;
  nowIso: string;
}): boolean {
  if (input.connection.adapter === "manual" || input.connection.adapter === "unsupported") {
    return false;
  }
  if (input.principal.assuranceStatus === "revoked") return false;
  if (input.connection.status !== "healthy") return false;
  if (input.connection.revokedAt) return false;
  return isGrantActive(input.grant, input.nowIso);
}

export function degradedConnectionStatus(adapter: AdapterSupportState): ConnectionStatus {
  if (adapter === "manual") return "manual_only";
  if (adapter === "unsupported") return "manual_only";
  return "degraded";
}

/**
 * Identity assurance must not be copied onto event provenance.
 * An identity-proofed principal may still attach unverified claims.
 */
export function assertSeparateTrustScales(input: {
  principal: PrincipalIdentity;
  receipt: ActivityReceipt;
}): void {
  assertOwnerMatch(input.principal.owner, input.receipt.owner);
  if (input.principal.assuranceTier === "identity_proofed") {
    if (input.receipt.provenance === "source_confirmed") {
      // Allowed only when the event itself was source-confirmed — not because of identity.
      return;
    }
  }
}

export function identityDoesNotImplyProvenance(
  tier: IdentityAssuranceTier,
): VerificationLevel {
  void tier;
  return "unverified";
}

export function privilegedProvenanceRequiresTrustedPath(
  provenance: VerificationLevel,
): boolean {
  return (PRIVILEGED_ACTIVITY_VERIFICATION_LEVELS as readonly string[]).includes(
    provenance,
  );
}

export function contextPackageIsMinimal(pack: ContextPackage): boolean {
  return pack.claims.length > 0 && pack.claims.length <= 12 && Boolean(pack.purpose);
}

export function agentActsForPrincipal(
  agent: AgentIdentity,
  principal: PrincipalIdentity,
): boolean {
  return (
    agent.principalId === principal.id &&
    sameOwner(agent.owner, principal.owner) &&
    agent.status === "active"
  );
}

export function assertNoPrivateFieldsOnCard(
  card: AgentCard,
  agent: AgentIdentity,
): void {
  const publicJson = JSON.stringify(card);
  for (const value of Object.values(agent.privateMetadata)) {
    if (value && publicJson.includes(value)) {
      throw new Error("private_metadata_on_card");
    }
  }
}
