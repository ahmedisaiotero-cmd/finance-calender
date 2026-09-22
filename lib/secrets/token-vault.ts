/**
 * Encrypts connector tokens at rest. Plaintext never belongs on ActivityEvent.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export class TokenVaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenVaultError";
  }
}

export function parseTokenVaultKey(
  hex: string | undefined,
): Buffer {
  const trimmed = hex?.trim() ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new TokenVaultError(
      "SYNC_TOKEN_VAULT_KEY must be 32 bytes encoded as 64 hex characters",
    );
  }
  return Buffer.from(trimmed, "hex");
}

export function encryptToken(plaintext: string, keyHex: string): string {
  const key = parseTokenVaultKey(keyHex);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptToken(payload: string, keyHex: string): string {
  const key = parseTokenVaultKey(keyHex);
  const raw = Buffer.from(payload, "base64");
  if (raw.length < IV_BYTES + AUTH_TAG_BYTES + 1) {
    throw new TokenVaultError("Token vault payload is truncated");
  }
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
