import type { ActivityOwner } from "@/lib/activity/ledger-types";
import type { Connection, PermissionGrant } from "@/lib/agent-trust/types";
import type { GithubAccess } from "@/lib/connectors/github/confirm";

export function githubAccessFixture(input: {
  owner: ActivityOwner;
  connectionId?: string;
  grantId?: string;
  accessToken?: string;
  resource?: string;
  expiresAt?: string;
  revokedAt?: string | null;
}): GithubAccess {
  const connectionId = input.connectionId ?? "conn-github-1";
  const connection: Connection = {
    id: connectionId,
    owner: input.owner,
    principalId: `principal-${input.owner.userId}`,
    agentId: "agent-github",
    adapter: "native",
    provider: "github",
    externalSubjectId: "42",
    protocol: "oauth",
    grantedScopes: ["read:user"],
    status: input.revokedAt ? "revoked" : "healthy",
    tokenVaultRef: `vault-${connectionId}`,
    lastVerifiedAt: "2026-09-19T18:00:00.000Z",
    expiresAt: input.expiresAt ?? "2026-10-19T18:00:00.000Z",
    revokedAt: input.revokedAt ?? null,
  };
  const grant: PermissionGrant = {
    id: input.grantId ?? "grant-github-1",
    owner: input.owner,
    agentId: "agent-github",
    resource: input.resource ?? "github:repo:octocat/Hello-World",
    actions: ["read"],
    purpose: "Confirm a public GitHub commit the user asked Sync to verify",
    source: connectionId,
    issuedAt: "2026-09-19T18:00:00.000Z",
    expiresAt: input.expiresAt ?? "2026-10-19T18:00:00.000Z",
    revokedAt: input.revokedAt ?? null,
    consentVersion: "github-slice-1",
    syncEnforced: true,
    providerEnforced: true,
  };
  return {
    connection,
    grant,
    accessToken: input.accessToken ?? "gho_test_token",
  };
}
