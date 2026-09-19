import assert from "node:assert/strict";
import { after, test } from "node:test";

import { githubAccessFixture } from "@/lib/connectors/github/access-fixture";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import { verifyGithubCommitForIdentity } from "@/lib/connectors/github/service";
import { createPrismaActivityEventStore } from "@/lib/db/activity-event-store";
import { createPrismaGithubAccessStore } from "@/lib/db/github-access-store";
import { createIsolatedPrismaClient } from "@/lib/db/isolated-prisma";
import type { RequestIdentity } from "@/lib/auth/request-identity";
import type { GithubFetch } from "@/lib/connectors/github/client";

const prisma = createIsolatedPrismaClient();
const skip = !prisma;
const VAULT_KEY = "cd".repeat(32);
const SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

after(async () => {
  await prisma?.$disconnect();
});

test("Prisma GitHub access: confirm then revoke on isolated Postgres", { skip }, async () => {
  if (!prisma) return;

  const user = await prisma.user.create({
    data: { email: `gh-${Date.now()}@sync.test` },
  });
  const workspace = await prisma.workspace.create({
    data: { ownerId: user.id, name: "GitHub test" },
  });
  const owner = { userId: user.id, workspaceId: workspace.id };
  const identity: RequestIdentity = {
    mode: "authenticated",
    user: { id: user.id, email: user.email, name: null },
    workspace: { id: workspace.id, name: workspace.name },
  };

  const accessStore = createPrismaGithubAccessStore(prisma);
  const activityStore = createPrismaActivityEventStore(prisma);
  const access = await accessStore.put(
    githubAccessFixture({
      owner,
      connectionId: `conn-github-${user.id}`,
      grantId: `grant-github-${user.id}`,
      resource: "github:public_commit",
    }),
    VAULT_KEY,
  );

  const fetchImpl: GithubFetch = async (url) => {
    if (String(url).includes("/commits/")) {
      return new Response(
        JSON.stringify({
          sha: SHA,
          commit: { committer: { date: "2026-09-18T12:00:00.000Z" } },
        }),
        { status: 200 },
      );
    }
    return new Response("not mocked", { status: 500 });
  };

  const receipt = await verifyGithubCommitForIdentity({
    identity,
    connectionId: access.connection.id,
    query: { repoOwner: "octocat", repo: "Hello-World", sha: SHA },
    idempotencyKey: `gh-int-${user.id}`,
    nowIso: "2026-09-19T19:00:00.000Z",
    vaultKey: VAULT_KEY,
    accessStore,
    activityStore,
    fetchImpl,
  });
  assert.equal(receipt.record.event.verification, "source_confirmed");
  assert.equal(receipt.record.userId, user.id);

  await accessStore.revoke(owner, access.connection.id, "2026-09-19T19:05:00.000Z");
  await assert.rejects(
    () => accessStore.get(owner, access.connection.id, VAULT_KEY),
    (error: unknown) =>
      error instanceof GithubConnectorError && error.code === "connection_revoked",
  );

  const vault = await prisma.tokenVaultRecord.findFirst({
    where: { userId: user.id, workspaceId: workspace.id },
  });
  assert.ok(vault?.destroyedAt);
  assert.equal(vault?.ciphertext, "");
});
