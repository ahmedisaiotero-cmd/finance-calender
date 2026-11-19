import { createHash } from "node:crypto";

import {
  consumeChatRateLimit,
  decideChatRateLimit,
  type ChatRateLimitDecision,
  type ChatRateLimitStore,
} from "@/lib/api/chat-rate-limit";
import {
  endpointRateLimitStoreRequired,
  resolveEndpointRateLimitConfig,
  type EndpointRateLimitBucket,
} from "@/lib/api/endpoint-rate-limit-config";

export type EndpointRateLimitDecision = ChatRateLimitDecision | { ok: true; skipped: true };

export type ConsumeEndpointRateLimit = (input: {
  bucket: EndpointRateLimitBucket;
  subjectId: string;
  nowMs?: number;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  store?: ChatRateLimitStore;
}) => Promise<EndpointRateLimitDecision>;

export function hashRateLimitSubject(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function endpointRateLimitSubject(
  bucket: EndpointRateLimitBucket,
  raw: string,
): string {
  return `${bucket}:${hashRateLimitSubject(raw)}`;
}

export async function consumeEndpointRateLimit(input: {
  bucket: EndpointRateLimitBucket;
  subjectId: string;
  nowMs?: number;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  store?: ChatRateLimitStore;
}): Promise<EndpointRateLimitDecision> {
  const env = input.env ?? process.env;
  const config = resolveEndpointRateLimitConfig(input.bucket, env);
  if (!config.ok) {
    return { ok: false, reason: "misconfigured" };
  }

  if (!input.store && !endpointRateLimitStoreRequired(env)) {
    return { ok: true, skipped: true };
  }

  return consumeChatRateLimit({
    subjectId: input.subjectId,
    nowMs: input.nowMs,
    env: {
      SYNC_CHAT_RATE_LIMIT_MAX: String(config.config.max),
      SYNC_CHAT_RATE_LIMIT_WINDOW_SECONDS: String(config.config.windowSeconds),
    } as unknown as NodeJS.ProcessEnv,
    store: input.store,
  });
}

export function endpointRateLimitResponse(
  decision: EndpointRateLimitDecision,
): { status: 429 | 503; error: string; retryAfterSeconds?: number } | null {
  if (decision.ok) return null;
  if (decision.reason === "limited") {
    return {
      status: 429,
      error: "Too many attempts. Please wait and try again.",
      retryAfterSeconds: decision.retryAfterSeconds,
    };
  }
  if (decision.reason === "misconfigured") {
    return { status: 503, error: "Rate limit is not configured" };
  }
  return { status: 503, error: "Temporarily unavailable" };
}

export { decideChatRateLimit };
