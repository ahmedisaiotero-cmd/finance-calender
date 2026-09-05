/**
 * Safety helpers for the activity + Passport layer.
 *
 * The contract must never persist raw secrets or provider tokens. These pure
 * helpers redact obvious credential material from any human-readable text or
 * scalar detail before an {@link ActivityEvent} is constructed. They are a
 * defense-in-depth guard, not a substitute for connectors never passing secrets
 * in the first place.
 */

/** Keys whose values should always be dropped from structured detail. */
const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|passwd|api[_-]?key|authorization|auth|bearer|credential|cookie|session|private[_-]?key|refresh[_-]?token|access[_-]?token)/i;

const REDACTION = "[redacted]";

/**
 * Patterns for values that look like credentials regardless of key name.
 * Order matters: more specific patterns run first.
 */
const VALUE_PATTERNS: Array<{ pattern: RegExp; replace: string }> = [
  // Bearer tokens: "Bearer abc.def.ghi"
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi, replace: `Bearer ${REDACTION}` },
  // JWT-like: three base64url segments separated by dots.
  {
    pattern: /\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    replace: REDACTION,
  },
  // Common provider key prefixes (OpenAI, Supabase, Stripe, GitHub, Google, Slack).
  {
    pattern:
      /\b(sk|pk|rk|sb|ey|xox[baprs]|gh[pousr]|AIza|ya29|AKIA|ASIA)[-_A-Za-z0-9]{12,}\b/g,
    replace: REDACTION,
  },
  // Long high-entropy hex/base64 blobs (>= 24 chars) that are almost certainly keys.
  { pattern: /\b[A-Fa-f0-9]{32,}\b/g, replace: REDACTION },
  { pattern: /\b[A-Za-z0-9+/]{32,}={0,2}\b/g, replace: REDACTION },
];

/**
 * Redact obvious secret material from free text. Returns the input unchanged
 * when nothing sensitive is detected.
 */
export function redactSecrets(text: string): string {
  if (!text) return text;
  let out = text;
  for (const { pattern, replace } of VALUE_PATTERNS) {
    out = out.replace(pattern, replace);
  }
  return out;
}

/** True when a string still appears to contain credential-like material. */
export function looksLikeSecret(text: string): boolean {
  if (!text) return false;
  return redactSecrets(text) !== text;
}

/**
 * Sanitize a structured detail map. Values under sensitive keys are dropped
 * entirely; string values are redacted; other scalars pass through.
 */
export function sanitizeDetail(
  detail: Record<string, string | number | boolean | null> | undefined,
): Record<string, string | number | boolean | null> | undefined {
  if (!detail) return undefined;
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clean[key] = REDACTION;
      continue;
    }
    clean[key] = typeof value === "string" ? redactSecrets(value) : value;
  }
  return clean;
}
