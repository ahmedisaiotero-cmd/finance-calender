import assert from "node:assert/strict";

import { handleAiActivityIngestPost } from "@/lib/api/ai-activity-ingest-handler";
import {
  handleAiActivityPairClaim,
  handleAiActivityPairIssue,
  handleAiActivityPairRevoke,
} from "@/lib/api/ai-activity-pair-handler";
import { createMemoryPairingStore } from "@/lib/ai-activity/pairing";
import type {
  AiOwnerIdentity,
  PersistAiCaptureResult,
} from "@/lib/db/ai-activity";
import type { ValidatedAiConversationCapturePayload } from "@/lib/ai-activity/types";

const env = {
  SYNC_OWNER_SECRET: "owner-secret",
  SYNC_OWNER_ID: "owner-1",
  SYNC_OWNER_EMAIL: "ahmed@example.com",
};

function ownerRequest(url: string, body?: unknown, secret = "owner-secret") {
  return new Request(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function capture(overrides: Record<string, unknown> = {}) {
  return {
    provider: "chatgpt",
    providerConversationId: "ext-thread-1",
    idempotencyKey: "ext-capture-1",
    title: "ChatGPT capture",
    origin: "https://chatgpt.com/c/1",
    capturedAt: "2026-11-06T02:10:00.000Z",
    captureMethod: "extension",
    messages: [{ role: "user", text: "Save this ChatGPT thread." }],
    ...overrides,
  };
}

async function main() {
  const store = createMemoryPairingStore();

  const missing = await handleAiActivityPairIssue(
    ownerRequest("http://localhost/api/ai-activity/pair"),
    { env: {}, pairingStore: store },
  );
  assert.equal(missing.status, 503);

  const unauthorized = await handleAiActivityPairIssue(
    ownerRequest("http://localhost/api/ai-activity/pair", undefined, "nope"),
    { env, pairingStore: store },
  );
  assert.equal(unauthorized.status, 401);

  const issued = await handleAiActivityPairIssue(
    ownerRequest("http://localhost/api/ai-activity/pair"),
    { env, pairingStore: store },
  );
  assert.equal(issued.status, 201);
  const issuedJson = (await issued.json()) as {
    code: string;
    expiresAt: string;
  };
  assert.match(issuedJson.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(Date.parse(issuedJson.expiresAt) > Date.now(), true);

  const expiredStore = createMemoryPairingStore();
  const expiredIssue = await handleAiActivityPairIssue(
    ownerRequest("http://localhost/api/ai-activity/pair"),
    { env, pairingStore: expiredStore },
  );
  const expiredCode = ((await expiredIssue.json()) as { code: string }).code;
  const expiredRecord = await expiredStore.findCodeByHash(
    (await import("@/lib/ai-activity/pairing")).hashPairingSecret(expiredCode),
  );
  assert.ok(expiredRecord);
  expiredRecord.expiresAt = "2026-01-01T00:00:00.000Z";
  const expiredClaim = await handleAiActivityPairClaim(
    new Request("http://localhost/api/ai-activity/pair/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: expiredCode }),
    }),
    { pairingStore: expiredStore },
  );
  assert.equal(expiredClaim.status, 400);

  const claimed = await handleAiActivityPairClaim(
    new Request("http://localhost/api/ai-activity/pair/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: issuedJson.code, label: "Ahmed laptop" }),
    }),
    { pairingStore: store },
  );
  assert.equal(claimed.status, 201);
  const claimedJson = (await claimed.json()) as {
    token: string;
    connectionId: string;
  };
  assert.equal(claimedJson.token.startsWith("syncdev_"), true);

  const replay = await handleAiActivityPairClaim(
    new Request("http://localhost/api/ai-activity/pair/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: issuedJson.code }),
    }),
    { pairingStore: store },
  );
  assert.equal(replay.status, 400);

  let persistedConnection: string | undefined;
  const upload = await handleAiActivityIngestPost(
    new Request("http://localhost/api/ai-activity/ingest", {
      method: "POST",
      headers: {
        authorization: `Bearer ${claimedJson.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(capture()),
    }),
    {
      env,
      pairingStore: store,
      persistCapture: async (input: {
        owner: AiOwnerIdentity;
        payload: ValidatedAiConversationCapturePayload;
      }) => {
        persistedConnection = input.payload.proof.connectionId;
        assert.equal(input.owner.ownerId, "owner-1");
        assert.equal(input.payload.captureMethod, "extension");
        const result: PersistAiCaptureResult = {
          providerId: "p1",
          sourceId: "s1",
          conversationId: "c1",
          activityEventId: "e1",
          messageIds: ["m1"],
        };
        return result;
      },
    },
  );
  assert.equal(upload.status, 201);
  assert.equal(persistedConnection, claimedJson.connectionId);

  const smuggledOrigin = await handleAiActivityIngestPost(
    new Request("http://localhost/api/ai-activity/ingest", {
      method: "POST",
      headers: {
        authorization: `Bearer ${claimedJson.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(
        capture({
          captureMethod: "paste_import",
          origin: "https://evil.example",
          idempotencyKey: "smuggle-origin",
        }),
      ),
    }),
    {
      env,
      pairingStore: store,
      persistCapture: async () => {
        throw new Error("should not persist smuggled origin");
      },
    },
  );
  assert.equal(smuggledOrigin.status, 400);

  const revoked = await handleAiActivityPairRevoke(
    ownerRequest("http://localhost/api/ai-activity/pair/revoke", {
      connectionId: claimedJson.connectionId,
    }),
    { env, pairingStore: store },
  );
  assert.equal(revoked.status, 200);

  const blocked = await handleAiActivityIngestPost(
    new Request("http://localhost/api/ai-activity/ingest", {
      method: "POST",
      headers: {
        authorization: `Bearer ${claimedJson.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(capture({ idempotencyKey: "after-revoke" })),
    }),
    {
      env,
      pairingStore: store,
      persistCapture: async () => {
        throw new Error("should not persist after revoke");
      },
    },
  );
  assert.equal(blocked.status, 403);

  console.log("ai-activity-pairing tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
