const REDACTED = "[redacted]";

const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|x-sync-owner-secret|password|passwd|secret|token|api[_-]?key|email|messages|transcript|payload|content|text|query_string|data)$/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER_RE = /\b(bearer)\s+[A-Za-z0-9._\-+=/]+/gi;
const OPENAI_KEY_RE = /\bsk-[A-Za-z0-9]{10,}\b/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._\-]+/g;
const HEX_SECRET_RE = /\b[a-f0-9]{64}\b/gi;

export type ScrubbableSentryEvent = {
  message?: string;
  request?: {
    data?: unknown;
    cookies?: unknown;
    headers?: Record<string, unknown> | Array<[string, unknown]>;
    query_string?: unknown;
    url?: string;
  };
  user?: {
    id?: string | number;
    email?: string | null;
    username?: string | null;
    ip_address?: string | null;
  };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  breadcrumbs?: { values?: Array<{ message?: string; data?: unknown }> };
  exception?: { values?: Array<{ value?: string; type?: string }> };
};

export function scrubSecretText(value: string): string {
  return value
    .replace(EMAIL_RE, REDACTED)
    .replace(BEARER_RE, "$1 [redacted]")
    .replace(OPENAI_KEY_RE, REDACTED)
    .replace(JWT_RE, REDACTED)
    .replace(HEX_SECRET_RE, REDACTED);
}

function scrubUnknown(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY.test(key)) return REDACTED;
  if (typeof value === "string") return scrubSecretText(value);
  if (Array.isArray(value)) {
    return value.map((entry) => scrubUnknown(entry));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
      next[childKey] = scrubUnknown(child, childKey);
    }
    return next;
  }
  return value;
}

function scrubHeaders(
  headers: Record<string, unknown> | Array<[string, unknown]> | undefined,
): Record<string, unknown> | undefined {
  if (!headers) return undefined;
  const entries = Array.isArray(headers)
    ? headers
    : Object.entries(headers);
  const next: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    next[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubUnknown(value, key);
  }
  return next;
}

export function sentryDsnFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  kind: "server" | "client" = "server",
): string | undefined {
  if (kind === "client") {
    const publicDsn = env.NEXT_PUBLIC_SENTRY_DSN?.trim();
    return publicDsn || undefined;
  }
  const dsn = env.SENTRY_DSN?.trim() || env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function scrubSentryEvent<T extends ScrubbableSentryEvent>(event: T): T {
  const next: ScrubbableSentryEvent = { ...event };

  if (typeof next.message === "string") {
    next.message = scrubSecretText(next.message);
  }

  if (next.request) {
    next.request = {
      ...next.request,
      data: undefined,
      cookies: undefined,
      query_string: undefined,
      headers: scrubHeaders(next.request.headers),
      url: next.request.url ? scrubSecretText(next.request.url) : next.request.url,
    };
  }

  if (next.user) {
    next.user = {
      id: next.user.id,
      email: undefined,
      username: undefined,
      ip_address: undefined,
    };
  }

  if (next.extra) {
    next.extra = scrubUnknown(next.extra) as Record<string, unknown>;
  }
  if (next.contexts) {
    next.contexts = scrubUnknown(next.contexts) as Record<string, unknown>;
  }
  if (next.breadcrumbs?.values) {
    next.breadcrumbs = {
      values: next.breadcrumbs.values.map((crumb) => ({
        ...crumb,
        message:
          typeof crumb.message === "string"
            ? scrubSecretText(crumb.message)
            : crumb.message,
        data: crumb.data ? scrubUnknown(crumb.data) : crumb.data,
      })),
    };
  }
  if (next.exception?.values) {
    next.exception = {
      values: next.exception.values.map((item) => ({
        ...item,
        value:
          typeof item.value === "string" ? scrubSecretText(item.value) : item.value,
      })),
    };
  }

  return next as T;
}

export function applySentryScrub<T>(event: T): T {
  return scrubSentryEvent(event as ScrubbableSentryEvent) as T;
}

export function sentryInitOptions(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  kind: "server" | "client" = "server",
) {
  const dsn = sentryDsnFromEnv(env, kind);
  if (!dsn) return null;
  return {
    dsn,
    sendDefaultPii: false as const,
    tracesSampleRate: 0,
    beforeSend: applySentryScrub,
    beforeSendTransaction: applySentryScrub,
  };
}
