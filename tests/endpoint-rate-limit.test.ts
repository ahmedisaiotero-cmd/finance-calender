import assert from "node:assert/strict";

import { handleAiActivityIngestPost } from "@/lib/api/ai-activity-ingest-handler";
import { handleAiActivityPairClaim } from "@/lib/api/ai-activity-pair-handler";
import { createMemoryPairingStore } from "@/lib/ai-activity/pairing";
import { handleAuthAttemptPost } from "@/lib/api/auth-attempt-handler";
import type { ChatRateLimitStore } from "@/lib/api/chat-rate-limit";
import {
  consumeEndpointRateLimit,
  endpointRateLimitSubject,
} from "@/lib/api/endpoint-rate-limit";
import { resolveEndpointRateLimitConfig } from "@/lib/api/endpoint-rate-limit-config";
import type { PersistAiCaptureResult } from "@/lib/db/ai-activity";

function memoryStore(): ChatRateLimitStore {
  const counts = new Map<string, number>();
  return {
    async incrementWindow(input) {
      const key = `${input.subjectId}:${input.windowStart.toISOString()}`;
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    async deleteExpiredWindows() {},
  };
}

{
  const defaults = resolveEndpointRateLimitConfig("ingest", {});
  assert.equal(defaults.ok, true);
  if (defaults.ok) {
    assert.equal(defaults.config.max, 60);
    assert.equal(defaults.config.windowSeconds, 3600);
  }
  assert.equal(
    resolveEndpointRateLimitConfig("login", { SYNC_LOGIN_RATE_LIMIT_MAX: "0" }).ok,
    false,
  );
}

async function main() {
  const store = memoryStore();
  const env = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/sync",
    SYNC_INGEST_RATE_LIMIT_MAX: "2",
    SYNC_INGEST_RATE_LIMIT_WINDOW_SECONDS: "3600",
    SYNC_CLAIM_RATE_LIMIT_MAX: "1",
    SYNC_CLAIM_RATE_LIMIT_WINDOW_SECONDS: "3600",
    SYNC_LOGIN_RATE_LIMIT_MAX: "1",
    SYNC_LOGIN_RATE_LIMIT_WINDOW_SECONDS: "900",
    SYNC_OWNER_SECRET: "owner-secret",
    SYNC_OWNER_ID: "owner-1",
    SYNC_OWNER_EMAIL: "owner@example.com",
    SYNC_CAPTURE_ENCRYPTION_KEY: "a".repeat(64),
  };

  const first = await consumeEndpointRateLimit({
    bucket: "ingest",
    subjectId: endpointRateLimitSubject("ingest", "owner-1"),
    env,
    store,
  });
  const second = await consumeEndpointRateLimit({
    bucket: "ingest",
    subjectId: endpointRateLimitSubject("ingest", "owner-1"),
    env,
    store,
  });
  const third = await consumeEndpointRateLimit({
    bucket: "ingest",
    subjectId: endpointRateLimitSubject("ingest", "owner-1"),
    env,
    store,
  });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);

  const persist = async () =>
    ({
      providerId: "p",
      sourceId: "s",
      conversationId: "c",
      activityEventId: "e",
      messageIds: ["m"],
    }) satisfies PersistAiCaptureResult;

  const ingestBody = {
    provider: "claude",
    providerConversationId: "t1",
    idempotencyKey: "k1",
    origin: "https://claude.ai/chat/1",
    capturedAt: "2026-11-19T12:00:00.000Z",
    captureMethod: "extension",
    messages: [{ role: "user", text: "hello" }],
  };

  const ingestLimited = await handleAiActivityIngestPost(
    new Request("http://localhost/api/ai-activity/ingest", {
      method: "POST",
      headers: {
        authorization: "Bearer owner-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify(ingestBody),
    }),
    {
      env,
      persistCapture: persist,
      rateLimitStore: store,
    },
  );
  assert.equal(ingestLimited.status, 429);

  const pairingStore = createMemoryPairingStore();
  const claimLimited = await handleAiActivityPairClaim(
    new Request("http://localhost/api/ai-activity/pair/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({ code: "AAAA-BBBB" }),
    }),
    { env, rateLimitStore: store, pairingStore },
  );
  const claimAgain = await handleAiActivityPairClaim(
    new Request("http://localhost/api/ai-activity/pair/claim", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({ code: "AAAA-CCCC" }),
    }),
    { env, rateLimitStore: store, pairingStore },
  );
  assert.equal(claimLimited.status === 400 || claimLimited.status === 201, true);
  assert.equal(claimAgain.status, 429);

  const loginStore = memoryStore();
  const loginEnv = {
    ...env,
    SYNC_LOGIN_RATE_LIMIT_MAX: "1",
  };
  let signInCalls = 0;
  const firstLogin = await handleAuthAttemptPost(
    new Request("http://localhost/api/auth/attempt", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.2",
      },
      body: JSON.stringify({
        action: "login",
        email: "person@example.com",
        password: "secret-password",
      }),
    }),
    {
      env: loginEnv,
      rateLimitStore: loginStore,
      createClient: () =>
        ({
          auth: {
            signInWithPassword: async () => {
              signInCalls += 1;
              return {
                data: {
                  user: { id: "u1", email: "person@example.com" },
                  session: { access_token: "tok" },
                },
                error: null,
              };
            },
          },
        }) as never,
    },
  );
  const secondLogin = await handleAuthAttemptPost(
    new Request("http://localhost/api/auth/attempt", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.2",
      },
      body: JSON.stringify({
        action: "login",
        email: "person@example.com",
        password: "secret-password",
      }),
    }),
    {
      env: loginEnv,
      rateLimitStore: loginStore,
      createClient: () =>
        ({
          auth: {
            signInWithPassword: async () => {
              signInCalls += 1;
              return {
                data: {
                  user: { id: "u1", email: "person@example.com" },
                  session: { access_token: "tok" },
                },
                error: null,
              };
            },
          },
        }) as never,
    },
  );
  assert.equal(firstLogin.status, 200);
  assert.equal(secondLogin.status, 429);
  assert.equal(signInCalls, 1);

  const badProd = await consumeEndpointRateLimit({
    bucket: "pair",
    subjectId: "pair:x",
    env: { NODE_ENV: "production", SYNC_PAIR_RATE_LIMIT_MAX: "nope" },
  });
  assert.equal(badProd.ok, false);
}

main()
  .then(() => {
    console.log("endpoint-rate-limit tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
