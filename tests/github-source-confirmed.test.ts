import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ActivityLedgerError,
  appendActivityEvent,
} from "@/lib/activity/ledger";
import { createMemoryActivityEventStore } from "@/lib/activity/memory-event-store";
import { githubAccessFixture } from "@/lib/connectors/github/access-fixture";
import {
  confirmGithubCommit,
  revokeGithubAccess,
} from "@/lib/connectors/github/confirm";
import { presentGithubCommitReceipt } from "@/lib/connectors/github/receipt";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import { createMemoryGithubAccessStore } from "@/lib/connectors/github/memory-access-store";
import {
  assertExactRedirectUri,
  createGithubOAuthStart,
  exchangeGithubOAuthCode,
  GITHUB_OAUTH_AUTHORIZE_URL,
} from "@/lib/connectors/github/oauth";
import {
  completeGithubOAuthSession,
  verifyGithubCommitForIdentity,
  revokeGithubForIdentity,
} from "@/lib/connectors/github/service";
import { encryptToken, decryptToken } from "@/lib/secrets/token-vault";
import type { RequestIdentity } from "@/lib/auth/request-identity";
import type { GithubFetch } from "@/lib/connectors/github/client";

const VAULT_KEY = "ab".repeat(32);
const NOW = "2026-09-19T18:30:00.000Z";
const SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const owner = { userId: "user-a", workspaceId: "ws-a" };

const identity: RequestIdentity = {
  mode: "authenticated",
  user: { id: "user-a", email: "a@sync.test", name: "A" },
  workspace: { id: "ws-a", name: "A" },
};

function githubFetchMock(input: {
  commitStatus?: number;
  commitBody?: unknown;
  tokenStatus?: number;
  tokenBody?: unknown;
  userStatus?: number;
}): GithubFetch {
  return async (url) => {
    if (url.includes("/login/oauth/access_token")) {
      return new Response(
        JSON.stringify(
          input.tokenBody ?? { access_token: "gho_live", scope: "read:user", token_type: "bearer" },
        ),
        { status: input.tokenStatus ?? 200 },
      );
    }
    if (url === "https://api.github.com/user") {
      return new Response(
        JSON.stringify({ id: 42, login: "octocat" }),
        { status: input.userStatus ?? 200 },
      );
    }
    if (url.includes("/commits/")) {
      return new Response(
        JSON.stringify(
          input.commitBody ?? {
            sha: SHA,
            commit: { committer: { date: "2026-09-18T12:00:00.000Z" } },
          },
        ),
        { status: input.commitStatus ?? 200 },
      );
    }
    return new Response("not mocked", { status: 500 });
  };
}

test("token vault round-trips and never stores the raw token in ciphertext equality", () => {
  const cipher = encryptToken("gho_secret", VAULT_KEY);
  assert.notEqual(cipher, "gho_secret");
  assert.equal(decryptToken(cipher, VAULT_KEY), "gho_secret");
});

test("OAuth start is PKCE and uses read:user only", () => {
  const start = createGithubOAuthStart({
    clientId: "client",
    clientSecret: "secret",
    redirectUri: "http://127.0.0.1:3000/api/connections/github/callback",
  });
  assert.ok(start.authorizeUrl.startsWith(GITHUB_OAUTH_AUTHORIZE_URL));
  assert.ok(start.authorizeUrl.includes("code_challenge_method=S256"));
  assert.ok(start.authorizeUrl.includes("scope=read%3Auser"));
  assert.ok(!start.authorizeUrl.includes("scope=repo"));
});

test("OAuth callback rejects a mismatched redirect URI", () => {
  assert.throws(
    () =>
      assertExactRedirectUri(
        "http://127.0.0.1:3000/api/connections/github/callback",
        "http://evil.example/callback",
      ),
    (error: unknown) =>
      error instanceof GithubConnectorError && error.code === "redirect_mismatch",
  );
});

test("official GitHub commit lookup writes one source_confirmed receipt", async () => {
  const store = createMemoryActivityEventStore();
  const access = githubAccessFixture({ owner });
  const prior = await appendActivityEvent(
    {
      owner,
      idempotencyKey: "agent-said-pass",
      event: {
        id: "evt-agent-1",
        kind: "result",
        actor: { kind: "assistant", id: "cursor", label: "Cursor" },
        source: { service: "cursor", external: true },
        timestamp: "2026-09-18T12:00:00.000Z",
        affectedAreas: ["work"],
        summary: "Tests passed.",
        evidence: [{ kind: "system_log", description: "Agent reported tests passed." }],
        verification: "self_reported",
        confidence: 0.4,
        reversibility: "reversible",
        permission: { scope: "repo.read", state: "granted" },
        visibility: "visible",
      },
    },
    { store },
  );

  const confirmed = await confirmGithubCommit({
    owner,
    access,
    query: { repoOwner: "octocat", repo: "Hello-World", sha: SHA.slice(0, 7) },
    identityAssuranceAtTime: "account_verified",
    priorEventId: prior.record.event.id,
    idempotencyKey: "github-confirm-1",
    nowIso: NOW,
    store,
    fetchImpl: githubFetchMock({}),
  });

  assert.equal(confirmed.reused, false);
  assert.equal(confirmed.record.event.verification, "source_confirmed");
  assert.equal(confirmed.record.event.kind, "context_access");
  assert.equal(confirmed.record.event.source.service, "github");
  assert.equal(confirmed.record.priorEventId, prior.record.event.id);
  assert.equal(prior.record.event.verification, "self_reported");
  assert.equal(confirmed.record.event.detail?.sha, SHA);
  assert.equal(confirmed.record.event.detail?.repoFullName, "octocat/Hello-World");
  assert.equal(
    confirmed.record.event.detail?.htmlUrl,
    `https://github.com/octocat/Hello-World/commit/${SHA}`,
  );
  assert.equal(
    confirmed.record.event.detail?.apiEndpoint,
    `https://api.github.com/repos/octocat/Hello-World/commits/${SHA}`,
  );
  assert.match(confirmed.record.event.summary, /exists/i);
  assert.doesNotMatch(confirmed.record.event.summary, /authored|you wrote|legal identity/i);
  assert.ok(
    !JSON.stringify(confirmed.record.event).includes("gho_test_token"),
  );
  const receipt = presentGithubCommitReceipt(confirmed.record.event);
  assert.equal(receipt.heading, "Confirmed by GitHub");
  assert.equal(receipt.verification, "source_confirmed");
  assert.match(receipt.role.read, /asked GitHub/i);
  assert.match(receipt.role.decision, /No judgment/i);
  assert.match(receipt.role.action, /Nothing was written/i);
  assert.ok(receipt.doesNotClaim.some((line) => /authored/i.test(line)));

  const replay = await confirmGithubCommit({
    owner,
    access,
    query: { repoOwner: "octocat", repo: "Hello-World", sha: SHA.slice(0, 7) },
    identityAssuranceAtTime: "account_verified",
    priorEventId: prior.record.event.id,
    idempotencyKey: "github-confirm-1",
    nowIso: NOW,
    store,
    fetchImpl: githubFetchMock({}),
  });
  assert.equal(replay.reused, true);
  assert.equal(replay.record.event.id, confirmed.record.event.id);
});

test("GitHub API failure creates no source_confirmed event", async () => {
  const store = createMemoryActivityEventStore();
  await assert.rejects(
    () =>
      confirmGithubCommit({
        owner,
        access: githubAccessFixture({ owner }),
        query: { repoOwner: "octocat", repo: "Hello-World", sha: SHA },
        identityAssuranceAtTime: "account_verified",
        idempotencyKey: "github-fail-1",
        nowIso: NOW,
        store,
        fetchImpl: githubFetchMock({ commitStatus: 500 }),
      }),
    (error: unknown) =>
      error instanceof GithubConnectorError && error.code === "github_unreachable",
  );
  const page = await store.list({ owner, limit: 20 });
  assert.equal(
    page.some((row) => row.event.verification === "source_confirmed"),
    false,
  );
});

test("expired GitHub grant cannot mint a confirmed receipt", async () => {
  const store = createMemoryActivityEventStore();
  await assert.rejects(
    () =>
      confirmGithubCommit({
        owner,
        access: githubAccessFixture({
          owner,
          expiresAt: "2026-09-01T00:00:00.000Z",
        }),
        query: { repoOwner: "octocat", repo: "Hello-World", sha: SHA },
        identityAssuranceAtTime: "account_verified",
        idempotencyKey: "github-expired-1",
        nowIso: NOW,
        store,
        fetchImpl: githubFetchMock({}),
      }),
    (error: unknown) =>
      error instanceof GithubConnectorError && error.code === "grant_inactive",
  );
});

test("public append cannot mint source_confirmed", async () => {
  const store = createMemoryActivityEventStore();
  await assert.rejects(
    () =>
      appendActivityEvent(
        {
          owner,
          idempotencyKey: "spoof",
          event: {
            id: "evt-spoof",
            kind: "result",
            actor: { kind: "user" },
            source: { service: "github" },
            timestamp: NOW,
            summary: "I connected GitHub",
            verification: "source_confirmed",
            reversibility: "reversible",
            permission: { scope: "github.commit.read", state: "granted" },
            visibility: "visible",
          },
        },
        { store },
      ),
    (error: unknown) =>
      error instanceof ActivityLedgerError &&
      error.code === "privileged_verification",
  );
});

test("revoke deletes the token and blocks later confirmation", async () => {
  const accessStore = createMemoryGithubAccessStore();
  const activityStore = createMemoryActivityEventStore();
  const stored = await accessStore.put(githubAccessFixture({ owner }), VAULT_KEY);
  await revokeGithubForIdentity({
    identity,
    connectionId: stored.connection.id,
    nowIso: NOW,
    accessStore,
  });

  await assert.rejects(
    () => accessStore.get(owner, stored.connection.id, VAULT_KEY),
    (error: unknown) =>
      error instanceof GithubConnectorError && error.code === "connection_revoked",
  );

  const revoked = revokeGithubAccess(githubAccessFixture({ owner }), NOW);
  await assert.rejects(
    () =>
      confirmGithubCommit({
        owner,
        access: revoked,
        query: { repoOwner: "octocat", repo: "Hello-World", sha: SHA },
        identityAssuranceAtTime: "account_verified",
        idempotencyKey: "after-revoke",
        nowIso: NOW,
        store: activityStore,
        fetchImpl: githubFetchMock({}),
      }),
    (error: unknown) =>
      error instanceof GithubConnectorError && error.code === "connection_revoked",
  );
});

test("foreign owner cannot read another user's GitHub connection", async () => {
  const accessStore = createMemoryGithubAccessStore();
  const stored = await accessStore.put(githubAccessFixture({ owner }), VAULT_KEY);
  await assert.rejects(
    () =>
      accessStore.get(
        { userId: "user-b", workspaceId: "ws-a" },
        stored.connection.id,
        VAULT_KEY,
      ),
    (error: unknown) =>
      error instanceof GithubConnectorError && error.code === "connection_not_found",
  );
});

test("OAuth completion plus verify uses the official API mock", async () => {
  const accessStore = createMemoryGithubAccessStore();
  const activityStore = createMemoryActivityEventStore();
  const start = createGithubOAuthStart({
    clientId: "client",
    clientSecret: "secret",
    redirectUri: "http://127.0.0.1:3000/api/connections/github/callback",
  });
  const fetchImpl = githubFetchMock({});
  await exchangeGithubOAuthCode({
    config: {
      clientId: "client",
      clientSecret: "secret",
      redirectUri: "http://127.0.0.1:3000/api/connections/github/callback",
    },
    code: "oauth-code",
    codeVerifier: start.codeVerifier,
    fetchImpl,
  });

  const access = await completeGithubOAuthSession({
    identity,
    config: {
      clientId: "client",
      clientSecret: "secret",
      redirectUri: "http://127.0.0.1:3000/api/connections/github/callback",
    },
    vaultKey: VAULT_KEY,
    code: "oauth-code",
    codeVerifierCipher: encryptToken(start.codeVerifier, VAULT_KEY),
    accessStore,
    fetchImpl,
    nowIso: NOW,
  });
  assert.equal(access.connection.externalSubjectId, "42");
  assert.equal(access.grant.resource, "github:public_commit");

  const receipt = await verifyGithubCommitForIdentity({
    identity,
    connectionId: access.connection.id,
    query: { repoOwner: "octocat", repo: "Hello-World", sha: SHA },
    idempotencyKey: "oauth-confirm-1",
    nowIso: NOW,
    vaultKey: VAULT_KEY,
    accessStore,
    activityStore,
    fetchImpl,
  });
  assert.equal(receipt.record.event.verification, "source_confirmed");
});
