import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  chatRateLimitRetryAfterSeconds,
  chatRateLimitWindowStartMs,
  resolveChatRateLimitConfig,
  type ChatRateLimitConfig,
} from "@/lib/api/chat-rate-limit-config";

export type ChatRateLimitDecision =
  | {
      ok: true;
      limit: number;
      remaining: number;
      resetAtMs: number;
      count: number;
      retryAfterSeconds: number;
    }
  | {
      ok: false;
      reason: "limited";
      limit: number;
      remaining: 0;
      resetAtMs: number;
      count: number;
      retryAfterSeconds: number;
    }
  | {
      ok: false;
      reason: "misconfigured" | "store_unavailable";
    };

export type ChatRateLimitStore = {
  incrementWindow(input: {
    subjectId: string;
    windowStart: Date;
  }): Promise<number>;
  deleteExpiredWindows(input: {
    subjectId: string;
    olderThan: Date;
  }): Promise<void>;
};

type RateLimitRow = { count: number };

/**
 * Atomic fixed-window increment via Postgres ON CONFLICT.
 * Concurrent first inserts cannot bypass the unique constraint.
 */
export async function prismaIncrementChatRateLimitWindow(input: {
  subjectId: string;
  windowStart: Date;
}): Promise<number> {
  const rows = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO "ChatRateLimitWindow" ("id", "subjectId", "windowStart", "count", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${input.subjectId}, ${input.windowStart}, 1, NOW(), NOW())
    ON CONFLICT ("subjectId", "windowStart")
    DO UPDATE SET
      "count" = "ChatRateLimitWindow"."count" + 1,
      "updatedAt" = NOW()
    RETURNING "count"
  `;

  const count = rows[0]?.count;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) {
    throw new Error("chat rate limit increment returned invalid count");
  }
  return count;
}

export async function prismaDeleteExpiredChatRateLimitWindows(input: {
  subjectId: string;
  olderThan: Date;
}): Promise<void> {
  await prisma.chatRateLimitWindow.deleteMany({
    where: {
      subjectId: input.subjectId,
      windowStart: { lt: input.olderThan },
    },
  });
}

export const prismaChatRateLimitStore: ChatRateLimitStore = {
  incrementWindow: prismaIncrementChatRateLimitWindow,
  deleteExpiredWindows: prismaDeleteExpiredChatRateLimitWindows,
};

export function decideChatRateLimit(input: {
  count: number;
  config: ChatRateLimitConfig;
  nowMs: number;
}): Extract<ChatRateLimitDecision, { ok: true } | { reason: "limited" }> {
  const resetAtMs =
    chatRateLimitWindowStartMs(input.nowMs, input.config.windowSeconds) +
    input.config.windowSeconds * 1000;
  const retryAfterSeconds = chatRateLimitRetryAfterSeconds(
    input.nowMs,
    input.config.windowSeconds,
  );

  if (input.count > input.config.max) {
    return {
      ok: false,
      reason: "limited",
      limit: input.config.max,
      remaining: 0,
      resetAtMs,
      count: input.count,
      retryAfterSeconds,
    };
  }

  return {
    ok: true,
    limit: input.config.max,
    remaining: Math.max(0, input.config.max - input.count),
    resetAtMs,
    count: input.count,
    retryAfterSeconds,
  };
}

/**
 * Consume one chat request against the trusted subject for the current UTC window.
 */
export async function consumeChatRateLimit(input: {
  subjectId: string;
  nowMs?: number;
  env?: NodeJS.ProcessEnv;
  store?: ChatRateLimitStore;
}): Promise<ChatRateLimitDecision> {
  const configResult = resolveChatRateLimitConfig(input.env);
  if (!configResult.ok) {
    return { ok: false, reason: "misconfigured" };
  }

  const nowMs = input.nowMs ?? Date.now();
  const windowStartMs = chatRateLimitWindowStartMs(
    nowMs,
    configResult.config.windowSeconds,
  );
  const windowStart = new Date(windowStartMs);
  const store = input.store ?? prismaChatRateLimitStore;

  let count: number;
  try {
    count = await store.incrementWindow({
      subjectId: input.subjectId,
      windowStart,
    });
  } catch (error) {
    console.error("chat rate limit store", error);
    return { ok: false, reason: "store_unavailable" };
  }

  // Best-effort retention: never undo the active increment on cleanup failure.
  try {
    await store.deleteExpiredWindows({
      subjectId: input.subjectId,
      olderThan: windowStart,
    });
  } catch (error) {
    console.error("chat rate limit cleanup", error);
  }

  return decideChatRateLimit({
    count,
    config: configResult.config,
    nowMs,
  });
}
