import { ownerFromIdentity } from "@/lib/activity/ledger";
import type { ActivityEventStore } from "@/lib/activity/ledger-types";
import type { RequestIdentity } from "@/lib/auth/request-identity";
import {
  confirmGithubCommit,
  type GithubAccess,
} from "@/lib/connectors/github/confirm";
import type { GithubCommitQuery, GithubFetch } from "@/lib/connectors/github/client";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import type { GithubAccessStore } from "@/lib/connectors/github/memory-access-store";
import {
  createGithubOAuthStart,
  exchangeGithubOAuthCode,
  fetchGithubAuthenticatedUser,
  requireGithubOAuthConfig,
  type GithubOAuthConfig,
} from "@/lib/connectors/github/oauth";
import { decryptToken, encryptToken } from "@/lib/secrets/token-vault";

export function requireTokenVaultKey(
  env: Record<string, string | undefined> = process.env,
): string {
  const key = env.SYNC_TOKEN_VAULT_KEY?.trim();
  if (!key) {
    throw new GithubConnectorError(
      "token_vault_unconfigured",
      "SYNC_TOKEN_VAULT_KEY is not configured",
      503,
    );
  }
  return key;
}

export function startGithubOAuthSession(input: {
  identity: RequestIdentity;
  env?: Record<string, string | undefined>;
}): {
  authorizeUrl: string;
  state: string;
  codeVerifierCipher: string;
  redirectUri: string;
  owner: ReturnType<typeof ownerFromIdentity>;
} {
  const env = input.env ?? process.env;
  const config = requireGithubOAuthConfig(env);
  const vaultKey = requireTokenVaultKey(env);
  const start = createGithubOAuthStart(config);
  return {
    authorizeUrl: start.authorizeUrl,
    state: start.state,
    codeVerifierCipher: encryptToken(start.codeVerifier, vaultKey),
    redirectUri: config.redirectUri,
    owner: ownerFromIdentity(input.identity),
  };
}

export async function completeGithubOAuthSession(input: {
  identity: RequestIdentity;
  config: GithubOAuthConfig;
  vaultKey: string;
  code: string;
  codeVerifierCipher: string;
  accessStore: GithubAccessStore;
  fetchImpl?: GithubFetch;
  nowIso: string;
}): Promise<GithubAccess> {
  const owner = ownerFromIdentity(input.identity);
  const codeVerifier = decryptToken(input.codeVerifierCipher, input.vaultKey);
  const token = await exchangeGithubOAuthCode({
    config: input.config,
    code: input.code,
    codeVerifier,
    fetchImpl: input.fetchImpl,
  });
  const githubUser = await fetchGithubAuthenticatedUser({
    accessToken: token.accessToken,
    fetchImpl: input.fetchImpl,
  });
  const access: GithubAccess = {
    accessToken: token.accessToken,
    connection: {
      id: `github-${owner.userId}-${githubUser.id}`,
      owner,
      principalId: `principal-${owner.userId}`,
      agentId: "agent-github",
      adapter: "native",
      provider: "github",
      externalSubjectId: githubUser.id,
      protocol: "oauth",
      grantedScopes: token.scope.split(/[,\s]+/).filter(Boolean),
      status: "healthy",
      lastVerifiedAt: input.nowIso,
      expiresAt: null,
      revokedAt: null,
    },
    grant: {
      id: `grant-github-${owner.userId}-${githubUser.id}`,
      owner,
      agentId: "agent-github",
      resource: "github:public_commit",
      actions: ["read"],
      purpose: "Confirm a public GitHub commit the user asked Sync to verify",
      source: `github-${owner.userId}-${githubUser.id}`,
      issuedAt: input.nowIso,
      expiresAt: new Date(Date.parse(input.nowIso) + 30 * 24 * 60 * 60 * 1000).toISOString(),
      consentVersion: "github-slice-1",
      syncEnforced: true,
      providerEnforced: true,
    },
  };
  return input.accessStore.put(access, input.vaultKey);
}

export async function verifyGithubCommitForIdentity(input: {
  identity: RequestIdentity;
  connectionId: string;
  query: GithubCommitQuery;
  priorEventId?: string | null;
  idempotencyKey: string;
  nowIso: string;
  vaultKey: string;
  accessStore: GithubAccessStore;
  activityStore: ActivityEventStore;
  fetchImpl?: GithubFetch;
}) {
  const owner = ownerFromIdentity(input.identity);
  const access = await input.accessStore.get(
    owner,
    input.connectionId,
    input.vaultKey,
  );
  return confirmGithubCommit({
    owner,
    access,
    query: input.query,
    identityAssuranceAtTime: "account_verified",
    priorEventId: input.priorEventId,
    idempotencyKey: input.idempotencyKey,
    nowIso: input.nowIso,
    store: input.activityStore,
    fetchImpl: input.fetchImpl,
  });
}

export async function revokeGithubForIdentity(input: {
  identity: RequestIdentity;
  connectionId: string;
  nowIso: string;
  accessStore: GithubAccessStore;
}) {
  const owner = ownerFromIdentity(input.identity);
  return input.accessStore.revoke(owner, input.connectionId, input.nowIso);
}
