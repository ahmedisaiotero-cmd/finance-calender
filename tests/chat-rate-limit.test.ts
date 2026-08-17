import assert from "node:assert/strict";
import { NextResponse } from "next/server";

import {
  CHAT_MAX_HISTORY_CONTENT_LENGTH,
  CHAT_MAX_HISTORY_ENTRIES,
  CHAT_MAX_MESSAGE_LENGTH,
  sanitizeChatHistory,
  validateChatMessage,
} from "@/lib/api/chat-request-guards";
import {
  handleChatPost,
  type ChatHandlerDeps,
} from "@/lib/api/chat-handler";
import {
  chatRateLimitRetryAfterSeconds,
  chatRateLimitSubject,
  chatRateLimitWindowStartMs,
  resolveChatRateLimitConfig,
} from "@/lib/api/chat-rate-limit-config";
import {
  consumeChatRateLimit,
  decideChatRateLimit,
  type ChatRateLimitStore,
} from "@/lib/api/chat-rate-limit";
import { isSyncDemoMode } from "@/lib/auth/demo-mode";
import type { RequestIdentity } from "@/lib/auth/request-identity";

function env(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...overrides } as NodeJS.ProcessEnv;
}

function identity(userId: string): RequestIdentity {
  return {
    mode: "authenticated",
    user: { id: userId, email: `${userId}@example.com`, name: null },
    workspace: { id: `ws-${userId}`, name: "Personal" },
  };
}

function memoryStore(): ChatRateLimitStore & {
  counts: Map<string, number>;
  cleanupCalls: number;
  failCleanup: boolean;
  failIncrement: boolean;
} {
  const counts = new Map<string, number>();
  const store = {
    counts,
    cleanupCalls: 0,
    failCleanup: false,
    failIncrement: false,
    async incrementWindow(input: { subjectId: string; windowStart: Date }) {
      if (store.failIncrement) throw new Error("db down");
      const key = `${input.subjectId}:${input.windowStart.toISOString()}`;
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    async deleteExpiredWindows() {
      store.cleanupCalls += 1;
      if (store.failCleanup) throw new Error("cleanup failed");
    },
  };
  return store;
}

{
  // Config defaults and fail-closed invalid values.
  const defaults = resolveChatRateLimitConfig(env({}));
  assert.equal(defaults.ok, true);
  if (defaults.ok) {
    assert.equal(defaults.config.max, 30);
    assert.equal(defaults.config.windowSeconds, 3600);
  }

  assert.equal(
    resolveChatRateLimitConfig(env({ SYNC_CHAT_RATE_LIMIT_MAX: "0" })).ok,
    false,
  );
  assert.equal(
    resolveChatRateLimitConfig(env({ SYNC_CHAT_RATE_LIMIT_MAX: "-1" })).ok,
    false,
  );
  assert.equal(
    resolveChatRateLimitConfig(env({ SYNC_CHAT_RATE_LIMIT_MAX: "1.5" })).ok,
    false,
  );
  assert.equal(
    resolveChatRateLimitConfig(
      env({ SYNC_CHAT_RATE_LIMIT_WINDOW_SECONDS: "0" }),
    ).ok,
    false,
  );
  assert.equal(
    resolveChatRateLimitConfig(
      env({ SYNC_CHAT_RATE_LIMIT_WINDOW_SECONDS: "abc" }),
    ).ok,
    false,
  );
}

{
  // Fixed UTC windows + Retry-After.
  const windowSeconds = 3600;
  const nowMs = Date.parse("2026-08-13T15:30:00.000Z");
  const start = chatRateLimitWindowStartMs(nowMs, windowSeconds);
  assert.equal(start, Date.parse("2026-08-13T15:00:00.000Z"));
  assert.equal(chatRateLimitRetryAfterSeconds(nowMs, windowSeconds), 1800);

  const nearEnd = Date.parse("2026-08-13T15:59:59.100Z");
  assert.equal(chatRateLimitRetryAfterSeconds(nearEnd, windowSeconds), 1);
}

{
  // Subject trust: client fields never win.
  assert.equal(
    chatRateLimitSubject(identity("user-trusted"), {
      userId: "attacker",
      workspaceId: "ws-attacker",
      ownerId: "owner-attacker",
    }),
    "user-trusted",
  );
}

{
  // Decision boundaries.
  const config = { max: 3, windowSeconds: 3600 };
  const nowMs = Date.parse("2026-08-13T15:10:00.000Z");

  const first = decideChatRateLimit({ count: 1, config, nowMs });
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.count, 1);
    assert.equal(first.remaining, 2);
  }

  const atMax = decideChatRateLimit({ count: 3, config, nowMs });
  assert.equal(atMax.ok, true);
  if (atMax.ok) assert.equal(atMax.remaining, 0);

  const over = decideChatRateLimit({ count: 4, config, nowMs });
  assert.equal(over.ok, false);
  if (!over.ok && over.reason === "limited") {
    assert.equal(over.retryAfterSeconds > 0, true);
    assert.equal(over.remaining, 0);
  }
}

async function runAsyncCases() {
  // Independent subjects + atomic sequential increments.
  const store = memoryStore();
  const nowMs = Date.parse("2026-08-13T15:10:00.000Z");
  const limitEnv = env({
    SYNC_CHAT_RATE_LIMIT_MAX: "3",
    SYNC_CHAT_RATE_LIMIT_WINDOW_SECONDS: "3600",
  });

  const a1 = await consumeChatRateLimit({
    subjectId: "user-a",
    nowMs,
    env: limitEnv,
    store,
  });
  assert.equal(a1.ok, true);
  if (a1.ok) assert.equal(a1.count, 1);

  const b1 = await consumeChatRateLimit({
    subjectId: "user-b",
    nowMs,
    env: limitEnv,
    store,
  });
  assert.equal(b1.ok, true);
  if (b1.ok) assert.equal(b1.count, 1);

  assert.equal(
    (
      await consumeChatRateLimit({
        subjectId: "user-a",
        nowMs,
        env: limitEnv,
        store,
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await consumeChatRateLimit({
        subjectId: "user-a",
        nowMs,
        env: limitEnv,
        store,
      })
    ).ok,
    true,
  );

  const limited = await consumeChatRateLimit({
    subjectId: "user-a",
    nowMs,
    env: limitEnv,
    store,
  });
  assert.equal(limited.ok, false);
  if (!limited.ok && limited.reason === "limited") {
    assert.equal(limited.retryAfterSeconds > 0, true);
  }

  // Concurrent increments cannot exceed via simple race on atomic store.
  const raceStore = memoryStore();
  const raceEnv = env({
    SYNC_CHAT_RATE_LIMIT_MAX: "5",
    SYNC_CHAT_RATE_LIMIT_WINDOW_SECONDS: "3600",
  });
  const raced = await Promise.all(
    Array.from({ length: 8 }, () =>
      consumeChatRateLimit({
        subjectId: "user-race",
        nowMs,
        env: raceEnv,
        store: raceStore,
      }),
    ),
  );
  const allowedRace = raced.filter((d) => d.ok).length;
  const denied = raced.filter((d) => !d.ok && d.reason === "limited").length;
  assert.equal(allowedRace, 5);
  assert.equal(denied, 3);

  // Window rollover resets availability.
  const rollStore = memoryStore();
  const rollEnv = env({
    SYNC_CHAT_RATE_LIMIT_MAX: "1",
    SYNC_CHAT_RATE_LIMIT_WINDOW_SECONDS: "3600",
  });
  const firstWindow = await consumeChatRateLimit({
    subjectId: "user-roll",
    nowMs,
    env: rollEnv,
    store: rollStore,
  });
  assert.equal(firstWindow.ok, true);
  const blocked = await consumeChatRateLimit({
    subjectId: "user-roll",
    nowMs: nowMs + 1000,
    env: rollEnv,
    store: rollStore,
  });
  assert.equal(blocked.ok, false);
  const nextWindow = await consumeChatRateLimit({
    subjectId: "user-roll",
    nowMs: nowMs + 3600_000,
    env: rollEnv,
    store: rollStore,
  });
  assert.equal(nextWindow.ok, true);
  if (nextWindow.ok) assert.equal(nextWindow.count, 1);

  // Invalid config fails closed.
  const badConfig = await consumeChatRateLimit({
    subjectId: "user-x",
    nowMs,
    env: env({ SYNC_CHAT_RATE_LIMIT_MAX: "0" }),
    store,
  });
  assert.deepEqual(badConfig, { ok: false, reason: "misconfigured" });

  // Store failure fails closed; cleanup failure does not reset counter.
  store.failIncrement = true;
  const storeFail = await consumeChatRateLimit({
    subjectId: "user-store",
    nowMs,
    env: limitEnv,
    store,
  });
  assert.deepEqual(storeFail, { ok: false, reason: "store_unavailable" });
  store.failIncrement = false;

  store.failCleanup = true;
  const beforeCleanupFail = await consumeChatRateLimit({
    subjectId: "user-cleanup",
    nowMs,
    env: limitEnv,
    store,
  });
  assert.equal(beforeCleanupFail.ok, true);
  if (beforeCleanupFail.ok) assert.equal(beforeCleanupFail.count, 1);
  assert.equal(store.cleanupCalls >= 1, true);

  // Route handler: auth, guards, limiter, OpenAI gating.
  let downstreamCalls = 0;
  const baseDeps = (overrides: Partial<ChatHandlerDeps> = {}): ChatHandlerDeps => ({
    loadIdentity: async () => ({
      ok: true as const,
      identity: identity("user-route"),
    }),
    consumeRateLimit: async () =>
      decideChatRateLimit({
        count: 1,
        config: { max: 30, windowSeconds: 3600 },
        nowMs,
      }),
    callChatDownstream: async () => {
      downstreamCalls += 1;
      return { ok: true as const, reply: "ok", source: "openai" as const };
    },
    loadProfile: async () => null,
    loadHistory: async () => [],
    saveTurn: async () => undefined,
    ...overrides,
  });

  const unauthorized = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
      headers: { "content-type": "application/json" },
    }),
    baseDeps({
      loadIdentity: async () => ({
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }),
    }),
  );
  assert.equal(unauthorized.status, 401);
  assert.equal(downstreamCalls, 0);

  const tooLong = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "x".repeat(CHAT_MAX_MESSAGE_LENGTH + 1) }),
      headers: { "content-type": "application/json" },
    }),
    baseDeps(),
  );
  assert.equal(tooLong.status, 400);
  assert.equal(downstreamCalls, 0);

  const rateLimited = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "hello",
        userId: "spoofed",
        workspaceId: "ws-spoofed",
      }),
      headers: { "content-type": "application/json" },
    }),
    baseDeps({
      consumeRateLimit: async ({ subjectId }) => {
        assert.equal(subjectId, "user-route");
        return {
          ok: false as const,
          reason: "limited" as const,
          limit: 30,
          remaining: 0 as const,
          resetAtMs: nowMs + 1800_000,
          count: 31,
          retryAfterSeconds: 1800,
        };
      },
    }),
  );
  assert.equal(rateLimited.status, 429);
  assert.equal(rateLimited.headers.get("Retry-After"), "1800");
  const limitedBody = await rateLimited.json();
  assert.equal(
    limitedBody.error,
    "Too many chat requests. Please try again later.",
  );
  assert.equal("subjectId" in limitedBody, false);
  assert.equal(downstreamCalls, 0);

  const storeUnavailable = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
      headers: { "content-type": "application/json" },
    }),
    baseDeps({
      consumeRateLimit: async () => ({
        ok: false as const,
        reason: "store_unavailable" as const,
      }),
    }),
  );
  assert.equal(storeUnavailable.status, 503);
  assert.equal(downstreamCalls, 0);

  const misconfigured = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
      headers: { "content-type": "application/json" },
    }),
    baseDeps({
      consumeRateLimit: async () => ({
        ok: false as const,
        reason: "misconfigured" as const,
      }),
    }),
  );
  assert.equal(misconfigured.status, 503);
  assert.equal(downstreamCalls, 0);

  const allowedResponse = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Rent is due Friday." }),
      headers: { "content-type": "application/json" },
    }),
    baseDeps(),
  );
  assert.equal(allowedResponse.status, 200);
  assert.equal(downstreamCalls, 1);
  assert.equal(allowedResponse.headers.get("X-RateLimit-Limit"), "30");
  const allowedBody = await allowedResponse.json();
  assert.equal(allowedBody.reply, "ok");
  assert.equal(allowedBody.source, "openai");

  // Demo contract unchanged: production cannot activate demo.
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "production", SYNC_DEMO_MODE: "true" })),
    false,
  );
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "development", SYNC_DEMO_MODE: "true" })),
    true,
  );

  // Existing history guards still apply.
  const history = sanitizeChatHistory(
    Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "x".repeat(CHAT_MAX_HISTORY_CONTENT_LENGTH + 50),
    })),
  );
  assert.equal(history.length, CHAT_MAX_HISTORY_ENTRIES);
  assert.equal(history.every((entry) => entry.content.length === CHAT_MAX_HISTORY_CONTENT_LENGTH), true);
  assert.equal(validateChatMessage("").ok, false);

  // Demo identity path still uses shared loader contract (subject = user.id).
  const demoIdentity: RequestIdentity = {
    mode: "demo",
    user: { id: "demo-user", email: "demo@finance-calendar.local", name: "Demo" },
    workspace: { id: "demo-ws", name: "Personal" },
  };
  assert.equal(chatRateLimitSubject(demoIdentity, { userId: "nope" }), "demo-user");
}

runAsyncCases()
  .then(() => {
    console.log("chat-rate-limit / chat-handler tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
