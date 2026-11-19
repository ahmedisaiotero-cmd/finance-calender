/**
 * AES-256-GCM encryption for captured conversation content at rest.
 *
 * Ciphertext is stored in the same string columns as plaintext, prefixed
 * with `enc:v1:` so legacy rows can be read until they are migrated.
 * Redaction still runs before encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const CAPTURE_ENCRYPTION_PREFIX = "enc:v1:";
export const CAPTURE_ENCRYPTION_KEY_ENV = "SYNC_CAPTURE_ENCRYPTION_KEY";
export const CAPTURE_ENCRYPTION_AAD = "sync-capture-v1";

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export class CaptureEncryptionError extends Error {
  readonly code = "capture_encryption";

  constructor(message: string) {
    super(message);
    this.name = "CaptureEncryptionError";
  }
}

type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function isCaptureEncryptionRequired(env: EnvLike = process.env): boolean {
  return env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
}

export function isEncryptedCaptureText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(CAPTURE_ENCRYPTION_PREFIX);
}

export function parseCaptureEncryptionKey(
  env: EnvLike = process.env,
): { ok: true; key: Buffer } | { ok: false; error: string } {
  const raw = env[CAPTURE_ENCRYPTION_KEY_ENV]?.trim() ?? "";
  if (!raw) {
    return {
      ok: false,
      error: `${CAPTURE_ENCRYPTION_KEY_ENV} is not set`,
    };
  }

  let key: Buffer | null = null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    try {
      const fromB64 = Buffer.from(raw, "base64");
      if (fromB64.length === KEY_LENGTH) key = fromB64;
    } catch {
      key = null;
    }
  }

  if (!key || key.length !== KEY_LENGTH) {
    return {
      ok: false,
      error: `${CAPTURE_ENCRYPTION_KEY_ENV} must be 32 bytes as 64 hex chars or base64`,
    };
  }

  return { ok: true, key };
}

export function requireCaptureEncryptionKey(env: EnvLike = process.env): Buffer {
  const parsed = parseCaptureEncryptionKey(env);
  if (!parsed.ok) {
    throw new CaptureEncryptionError(parsed.error);
  }
  return parsed.key;
}

/**
 * Encrypt a capture field. Idempotent for already-encrypted values.
 * Production fails closed when the key is missing or invalid.
 * Non-production without a key leaves plaintext so local tests still run.
 */
export function encryptCaptureText(
  plaintext: string | null | undefined,
  env: EnvLike = process.env,
): string | null {
  if (plaintext == null) return null;
  if (isEncryptedCaptureText(plaintext)) return plaintext;

  const parsed = parseCaptureEncryptionKey(env);
  if (!parsed.ok) {
    if (isCaptureEncryptionRequired(env)) {
      throw new CaptureEncryptionError(parsed.error);
    }
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", parsed.key, iv);
  cipher.setAAD(Buffer.from(CAPTURE_ENCRYPTION_AAD));
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, encrypted]);
  return `${CAPTURE_ENCRYPTION_PREFIX}${packed.toString("base64url")}`;
}

export function decryptCaptureText(
  stored: string | null | undefined,
  env: EnvLike = process.env,
): string | null {
  if (stored == null) return null;
  if (!isEncryptedCaptureText(stored)) return stored;

  const key = requireCaptureEncryptionKey(env);
  const packed = Buffer.from(
    stored.slice(CAPTURE_ENCRYPTION_PREFIX.length),
    "base64url",
  );
  if (packed.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new CaptureEncryptionError("Encrypted capture payload is truncated");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(CAPTURE_ENCRYPTION_AAD));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    throw new CaptureEncryptionError("Unable to decrypt capture content");
  }
}

export function encryptCaptureTextRequired(
  plaintext: string,
  env: EnvLike = process.env,
): string {
  const encrypted = encryptCaptureText(plaintext, env);
  if (encrypted == null) {
    throw new CaptureEncryptionError("Capture content missing");
  }
  return encrypted;
}

export function decryptCaptureTextRequired(
  stored: string,
  env: EnvLike = process.env,
): string {
  return decryptCaptureText(stored, env) ?? "";
}

/** Refuse writes in production when the capture key is missing or invalid. */
export function assertWritableCaptureEncryption(
  env: EnvLike = process.env,
): { ok: true } | { ok: false; error: string } {
  const parsed = parseCaptureEncryptionKey(env);
  if (parsed.ok) return { ok: true };
  if (isCaptureEncryptionRequired(env)) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true };
}
