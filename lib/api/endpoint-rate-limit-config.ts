import { isSyncDemoMode } from "@/lib/auth/demo-mode";
import { isDatabaseConfigured } from "@/lib/prisma";

export const ENDPOINT_RATE_LIMIT_BUCKETS = [
  "ingest",
  "pair",
  "claim",
  "login",
  "signup",
] as const;

export type EndpointRateLimitBucket =
  (typeof ENDPOINT_RATE_LIMIT_BUCKETS)[number];

export const ENDPOINT_RATE_LIMIT_DEFAULTS: Record<
  EndpointRateLimitBucket,
  { max: number; windowSeconds: number }
> = {
  ingest: { max: 60, windowSeconds: 3600 },
  pair: { max: 20, windowSeconds: 3600 },
  claim: { max: 30, windowSeconds: 3600 },
  login: { max: 10, windowSeconds: 900 },
  signup: { max: 5, windowSeconds: 3600 },
};

export const ENDPOINT_RATE_LIMIT_MAX_BOUND = 10_000;
export const ENDPOINT_RATE_LIMIT_WINDOW_SECONDS_BOUND = 86_400 * 7;

export type EndpointRateLimitConfig = {
  max: number;
  windowSeconds: number;
};

export type EndpointRateLimitConfigResult =
  | { ok: true; config: EndpointRateLimitConfig }
  | { ok: false; error: string };

const ENV_KEYS: Record<
  EndpointRateLimitBucket,
  { max: string; window: string }
> = {
  ingest: {
    max: "SYNC_INGEST_RATE_LIMIT_MAX",
    window: "SYNC_INGEST_RATE_LIMIT_WINDOW_SECONDS",
  },
  pair: {
    max: "SYNC_PAIR_RATE_LIMIT_MAX",
    window: "SYNC_PAIR_RATE_LIMIT_WINDOW_SECONDS",
  },
  claim: {
    max: "SYNC_CLAIM_RATE_LIMIT_MAX",
    window: "SYNC_CLAIM_RATE_LIMIT_WINDOW_SECONDS",
  },
  login: {
    max: "SYNC_LOGIN_RATE_LIMIT_MAX",
    window: "SYNC_LOGIN_RATE_LIMIT_WINDOW_SECONDS",
  },
  signup: {
    max: "SYNC_SIGNUP_RATE_LIMIT_MAX",
    window: "SYNC_SIGNUP_RATE_LIMIT_WINDOW_SECONDS",
  },
};

function parseBoundedPositiveInt(
  raw: string | undefined,
  fallback: number,
  bound: number,
  label: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (raw === undefined || raw.trim() === "") {
    return { ok: true, value: fallback };
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > bound) {
    return {
      ok: false,
      error: `${label} must be an integer from 1 to ${bound}`,
    };
  }
  return { ok: true, value };
}

export function resolveEndpointRateLimitConfig(
  bucket: EndpointRateLimitBucket,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): EndpointRateLimitConfigResult {
  const keys = ENV_KEYS[bucket];
  const defaults = ENDPOINT_RATE_LIMIT_DEFAULTS[bucket];
  const maxResult = parseBoundedPositiveInt(
    env[keys.max],
    defaults.max,
    ENDPOINT_RATE_LIMIT_MAX_BOUND,
    keys.max,
  );
  if (!maxResult.ok) return maxResult;
  const windowResult = parseBoundedPositiveInt(
    env[keys.window],
    defaults.windowSeconds,
    ENDPOINT_RATE_LIMIT_WINDOW_SECONDS_BOUND,
    keys.window,
  );
  if (!windowResult.ok) return windowResult;
  return {
    ok: true,
    config: {
      max: maxResult.value,
      windowSeconds: windowResult.value,
    },
  };
}

export function isProductionRuntime(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

/**
 * Production fails closed without a database. Local tests without DATABASE_URL
 * skip limiting so existing unit tests keep running.
 */
export function endpointRateLimitStoreRequired(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  if (isSyncDemoMode(env as NodeJS.ProcessEnv)) return false;
  if (isProductionRuntime(env)) return true;
  return Boolean(env.DATABASE_URL) || isDatabaseConfigured();
}

export function requestClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
