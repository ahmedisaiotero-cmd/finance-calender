import assert from "node:assert/strict";

import { handleAiActivityIngestPost } from "@/lib/api/ai-activity-ingest-handler";
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

function capture(overrides: Record<string, unknown> = {}) {
  return {
    provider: "claude",
    providerConversationId: "claude-thread-1",
    idempotencyKey: "same-capture",
    title: "Claude advice",
    origin: "https://claude.ai/chat/thread",
    capturedAt: "2026-11-05T20:00:00.000Z",
    captureMethod: "extension",
    messages: [
      {
        providerMessageId: "m-1",
        role: "user",
        text: "API key sk-ABCDEFGHIJKLMNOP1234567890 and account 123456789012",
      },
      {
        providerMessageId: "m-2",
        role: "assistant",
        text: "Here is the plan.",
      },
    ],
    ...overrides,
  };
}

function request(body: unknown, secret = "owner-secret") {
  return new Request("http://localhost/api/ai-activity/ingest", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function result(): PersistAiCaptureResult {
  return {
    providerId: "provider-1",
    sourceId: "source-1",
    conversationId: "conversation-1",
    activityEventId: "event-1",
    messageIds: ["message-1", "message-2"],
  };
}

async function main() {
  let persisted:
    | {
        owner: AiOwnerIdentity;
        payload: ValidatedAiConversationCapturePayload;
      }
    | undefined;

  const response = await handleAiActivityIngestPost(request(capture()), {
    env,
    persistCapture: async (input) => {
      persisted = input;
      return result();
    },
  });

  assert.equal(response.status, 201);
  assert.equal(persisted?.owner.ownerId, "owner-1");
  assert.equal(persisted?.payload.provider, "claude");
  assert.equal(persisted?.payload.idempotencyKey, "same-capture");
  assert.equal(persisted?.payload.origin, "https://claude.ai");
  assert.equal(persisted?.payload.messages.length, 2);

  const json = await response.json();
  assert.deepEqual(json, {
    ok: true,
    conversationId: "conversation-1",
    activityEventId: "event-1",
    messageCount: 2,
  });

  const missingAuth = await handleAiActivityIngestPost(
    new Request("http://localhost/api/ai-activity/ingest", {
      method: "POST",
      body: JSON.stringify(capture()),
    }),
    { env },
  );
  assert.equal(missingAuth.status, 401);

  const wrongAuth = await handleAiActivityIngestPost(
    request(capture(), "wrong-secret"),
    { env },
  );
  assert.equal(wrongAuth.status, 401);

  const missingConfig = await handleAiActivityIngestPost(request(capture()), {
    env: {},
  });
  assert.equal(missingConfig.status, 503);

  const invalid = await handleAiActivityIngestPost(
    request(capture({ messages: [] })),
    { env },
  );
  assert.equal(invalid.status, 400);

  const invalidOrigin = await handleAiActivityIngestPost(
    request(capture({ origin: "https://chatgpt.com/c/not-claude" })),
    { env },
  );
  assert.equal(invalidOrigin.status, 400);

  let calls = 0;
  const seen = new Map<string, PersistAiCaptureResult>();
  const persist = async (input: {
    owner: AiOwnerIdentity;
    payload: ValidatedAiConversationCapturePayload;
  }) => {
    calls += 1;
    const key = `${input.owner.ownerId}:${input.payload.provider}:${input.payload.idempotencyKey}`;
    if (!seen.has(key)) seen.set(key, result());
    return seen.get(key)!;
  };

  const first = await handleAiActivityIngestPost(request(capture()), {
    env,
    persistCapture: persist,
  });
  const second = await handleAiActivityIngestPost(request(capture()), {
    env,
    persistCapture: persist,
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(calls, 2);
  assert.equal((await first.json()).conversationId, (await second.json()).conversationId);

  const oversized = await handleAiActivityIngestPost(
    new Request("http://localhost/api/ai-activity/ingest", {
      method: "POST",
      headers: {
        authorization: "Bearer owner-secret",
        "content-length": String(300 * 1024),
      },
      body: JSON.stringify(capture()),
    }),
    { env },
  );
  assert.equal(oversized.status, 413);

  const revoked = await handleAiActivityIngestPost(request(capture()), {
    env,
    persistCapture: async () => {
      throw new Error("AI capture source is revoked");
    },
  });
  assert.equal(revoked.status, 403);

  console.log("ai-activity-ingest tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
