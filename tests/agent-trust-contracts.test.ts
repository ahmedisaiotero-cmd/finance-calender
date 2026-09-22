import assert from "node:assert/strict";

import type { VerificationLevel } from "@/lib/activity/types";
import {
  agentActsForPrincipal,
  assertDelegationDefaults,
  assertNoPrivateFieldsOnCard,
  assertOwnerMatch,
  connectionShowsInSync,
  degradedConnectionStatus,
  grantAllows,
  identityDoesNotImplyProvenance,
  identityTierRank,
  isGrantActive,
  narrowGrant,
  privilegedProvenanceRequiresTrustedPath,
  publicAgentCardHasNoSecrets,
  rejectClientIdentityUpgrade,
} from "@/lib/agent-trust/invariants";
import type {
  AgentCard,
  AgentIdentity,
  Connection,
  Delegation,
  PermissionGrant,
  PrincipalIdentity,
} from "@/lib/agent-trust/types";

const ownerA = { userId: "user-a", workspaceId: "ws-a" };
const ownerB = { userId: "user-b", workspaceId: "ws-b" };
const now = "2026-09-19T17:00:00.000Z";

function principal(
  partial: Partial<PrincipalIdentity> = {},
): PrincipalIdentity {
  return {
    id: "prin-1",
    owner: ownerA,
    assuranceTier: "account_verified",
    assuranceStatus: "verified",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function grant(partial: Partial<PermissionGrant> = {}): PermissionGrant {
  return {
    id: "grant-1",
    owner: ownerA,
    agentId: "agent-1",
    resource: "github.repo.finance-calender",
    actions: ["read"],
    purpose: "Verify CI checks",
    issuedAt: now,
    expiresAt: "2026-09-19T19:00:00.000Z",
    consentVersion: "v1",
    syncEnforced: true,
    providerEnforced: true,
    ...partial,
  };
}

function connection(partial: Partial<Connection> = {}): Connection {
  return {
    id: "conn-1",
    owner: ownerA,
    principalId: "prin-1",
    adapter: "native",
    provider: "github",
    protocol: "oauth",
    grantedScopes: ["repo"],
    status: "healthy",
    lastVerifiedAt: now,
    ...partial,
  };
}

async function main() {
  assert.throws(() => assertOwnerMatch(ownerA, ownerB), /owner_mismatch/);
  assertOwnerMatch(ownerA, ownerA);

  assert.equal(identityTierRank("identity_proofed") > identityTierRank("account_verified"), true);
  assert.throws(
    () => rejectClientIdentityUpgrade("account_verified", "identity_proofed"),
    /implicit_identity_upgrade/,
  );
  assert.equal(
    rejectClientIdentityUpgrade("source_linked", "account_verified"),
    "account_verified",
  );

  assert.equal(identityDoesNotImplyProvenance("identity_proofed"), "unverified");
  assert.equal(privilegedProvenanceRequiresTrustedPath("source_confirmed"), true);
  assert.equal(privilegedProvenanceRequiresTrustedPath("self_reported"), false);

  const proofed = principal({
    assuranceTier: "identity_proofed",
    assuranceStatus: "verified",
  });
  const unverifiedClaim: VerificationLevel = "unverified";
  assert.notEqual(proofed.assuranceTier, unverifiedClaim);

  const active = grant();
  assert.equal(isGrantActive(active, now), true);
  assert.equal(grantAllows(active, "read", now), true);
  assert.equal(grantAllows(active, "execute", now), false);
  assert.equal(
    isGrantActive(grant({ revokedAt: now }), now),
    false,
  );
  assert.equal(
    isGrantActive(grant({ expiresAt: "2026-09-19T16:00:00.000Z" }), now),
    false,
  );

  const narrowed = narrowGrant(active, ["read"], "2026-09-19T18:00:00.000Z");
  assert.deepEqual(narrowed.actions, ["read"]);
  assert.throws(() => narrowGrant(active, ["read", "execute"], active.expiresAt), /upgrade/);
  assert.throws(
    () => narrowGrant(active, ["read"], "2026-09-20T00:00:00.000Z"),
    /upgrade/,
  );

  const delegation: Delegation = {
    id: "del-1",
    owner: ownerA,
    principalId: "prin-1",
    agentId: "agent-1",
    audience: "github",
    grantIds: ["grant-1"],
    purpose: "Read checks",
    issuedAt: now,
    expiresAt: "2026-09-19T19:00:00.000Z",
    depth: 0,
    redelegationAllowed: false,
  };
  assertDelegationDefaults(delegation);
  assert.throws(
    () => assertDelegationDefaults({ ...delegation, redelegationAllowed: true }),
    /redelegation/,
  );

  const card: AgentCard = {
    agentId: "agent-1",
    name: "Cursor",
    description: "Coding agent",
    capabilities: ["repo.read"],
    skills: ["review"],
    interfaces: ["mcp"],
    securityRequirements: ["oauth"],
  };
  assert.equal(publicAgentCardHasNoSecrets(card), true);
  assert.equal(
    publicAgentCardHasNoSecrets({
      ...card,
      description: "Bearer super-secret-token",
    }),
    false,
  );

  const agent: AgentIdentity = {
    id: "agent-1",
    owner: ownerA,
    principalId: "prin-1",
    provider: "cursor",
    displayName: "Cursor",
    agentType: "assistant",
    declaredCapabilities: ["repo.read"],
    supportedProtocols: ["mcp"],
    publicMetadata: { label: "Cursor" },
    privateMetadata: { vaultHint: "vault-ref-99" },
    status: "active",
    createdAt: now,
  };
  assert.equal(agentActsForPrincipal(agent, proofed), true);
  assert.equal(
    agentActsForPrincipal({ ...agent, owner: ownerB }, proofed),
    false,
  );
  assert.throws(
    () =>
      assertNoPrivateFieldsOnCard(
        { ...card, description: "vault-ref-99" },
        agent,
      ),
    /private_metadata/,
  );

  assert.equal(
    connectionShowsInSync({
      principal: proofed,
      connection: connection(),
      grant: active,
      nowIso: now,
    }),
    true,
  );
  assert.equal(
    connectionShowsInSync({
      principal: proofed,
      connection: connection({ adapter: "manual", status: "manual_only" }),
      grant: active,
      nowIso: now,
    }),
    false,
  );
  assert.equal(degradedConnectionStatus("manual"), "manual_only");
  assert.equal(
    connectionShowsInSync({
      principal: proofed,
      connection: connection({ status: "revoked", revokedAt: now }),
      grant: active,
      nowIso: now,
    }),
    false,
  );

  console.log("agent-trust-contracts tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
