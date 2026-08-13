export const CHAT_RATE_LIMIT_DEFAULT_MAX = 30;
export const CHAT_RATE_LIMIT_DEFAULT_WINDOW_SECONDS = 3600;

/** Hard bounds so misconfiguration cannot silently disable protection. */
export const CHAT_RATE_LIMIT_MAX_BOUND = 10_000;
export const CHAT_RATE_LIMIT_WINDOW_SECONDS_BOUND = 86_400 * 7;

export type ChatRateLimitConfig = {
  max: number;
  windowSeconds: number;
};

export type ChatRateLimitConfigResult =
  | { ok: true; config: ChatRateLimitConfig }
  | { ok: false; error: string };

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

/**
 * Resolve chat rate-limit configuration.
 * Missing vars use safe defaults. Invalid values never silently disable limiting.
 */
export function resolveChatRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): ChatRateLimitConfigResult {
  const maxResult = parseBoundedPositiveInt(
    env.SYNC_CHAT_RATE_LIMIT_MAX,
    CHAT_RATE_LIMIT_DEFAULT_MAX,
    CHAT_RATE_LIMIT_MAX_BOUND,
    "SYNC_CHAT_RATE_LIMIT_MAX",
  );
  if (!maxResult.ok) return maxResult;

  const windowResult = parseBoundedPositiveInt(
    env.SYNC_CHAT_RATE_LIMIT_WINDOW_SECONDS,
    CHAT_RATE_LIMIT_DEFAULT_WINDOW_SECONDS,
    CHAT_RATE_LIMIT_WINDOW_SECONDS_BOUND,
    "SYNC_CHAT_RATE_LIMIT_WINDOW_SECONDS",
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

/** UTC fixed-window start for the given clock. */
export function chatRateLimitWindowStartMs(
  nowMs: number,
  windowSeconds: number,
): number {
  const windowMs = windowSeconds * 1000;
  return Math.floor(nowMs / windowMs) * windowMs;
}

export function chatRateLimitRetryAfterSeconds(
  nowMs: number,
  windowSeconds: number,
): number {
  const windowMs = windowSeconds * 1000;
  const windowStart = chatRateLimitWindowStartMs(nowMs, windowSeconds);
  const resetAt = windowStart + windowMs;
  return Math.max(1, Math.ceil((resetAt - nowMs) / 1000));
}

/**
 * Trusted limiter subject. Client-supplied ownership fields are ignored.
 */
export function chatRateLimitSubject(
  identity: { user: { id: string } },
  _clientBody?: unknown,
): string {
  void _clientBody;
  return identity.user.id;
}
