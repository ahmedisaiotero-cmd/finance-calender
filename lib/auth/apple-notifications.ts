import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";

/**
 * Sign in with Apple server-to-server notifications and token revocation.
 * If Apple sign-in is enabled, revocation credentials are required — this
 * module refuses to no-op.
 */

export const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";
export const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

export type AppleAuthEnv = {
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
} & Record<string, string | undefined>;

export function isAppleSignInConfigured(env: AppleAuthEnv): boolean {
  return Boolean(
    env.APPLE_CLIENT_ID?.trim() &&
      env.APPLE_TEAM_ID?.trim() &&
      env.APPLE_KEY_ID?.trim() &&
      env.APPLE_PRIVATE_KEY?.trim(),
  );
}

export function appleRevocationRequired(
  appleEnabled: boolean,
  env: AppleAuthEnv,
): { ok: true } | { ok: false; error: string } {
  if (!appleEnabled) return { ok: true };
  if (!isAppleSignInConfigured(env)) {
    return {
      ok: false,
      error:
        "Sign in with Apple is enabled, but Apple revocation credentials are missing. Set APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY.",
    };
  }
  return { ok: true };
}

function normalizePrivateKey(raw: string): string {
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export async function createAppleClientSecret(
  env: AppleAuthEnv,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const clientId = env.APPLE_CLIENT_ID?.trim();
  const teamId = env.APPLE_TEAM_ID?.trim();
  const keyId = env.APPLE_KEY_ID?.trim();
  const privateKey = env.APPLE_PRIVATE_KEY?.trim();
  if (!clientId || !teamId || !keyId || !privateKey) {
    throw new Error("Apple revocation credentials are incomplete.");
  }

  const key = await importPKCS8(normalizePrivateKey(privateKey), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 15)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(key);
}

export async function revokeAppleToken(input: {
  token: string;
  tokenType: "refresh_token" | "access_token";
  env: AppleAuthEnv;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const configured = appleRevocationRequired(true, input.env);
  if (!configured.ok) throw new Error(configured.error);

  const clientSecret = await createAppleClientSecret(input.env);
  const body = new URLSearchParams({
    client_id: input.env.APPLE_CLIENT_ID!.trim(),
    client_secret: clientSecret,
    token: input.token,
    token_type_hint: input.tokenType,
  });

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(APPLE_REVOKE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Apple token revocation failed (${response.status}).`);
  }
}

export type AppleNotificationEvent = {
  type?: string;
  sub?: string;
  events?: { type?: string; sub?: string };
};

const appleJwks = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

export async function verifyAppleServerNotification(
  payload: string,
): Promise<AppleNotificationEvent> {
  if (!payload.trim()) {
    throw new Error("Empty Apple notification.");
  }

  const { payload: claims } = await jwtVerify(payload, appleJwks, {
    issuer: "https://appleid.apple.com",
  });
  return claims as AppleNotificationEvent;
}

export async function revokeAppleTokensForUser(input: {
  refreshToken?: string | null;
  accessToken?: string | null;
  appleEnabled: boolean;
  env: AppleAuthEnv;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const required = appleRevocationRequired(input.appleEnabled, input.env);
  if (!required.ok) throw new Error(required.error);
  if (!input.appleEnabled) return;

  const token = input.refreshToken || input.accessToken;
  if (!token) {
    throw new Error(
      "Sign in with Apple is enabled, but no Apple token was available to revoke.",
    );
  }

  await revokeAppleToken({
    token,
    tokenType: input.refreshToken ? "refresh_token" : "access_token",
    env: input.env,
    fetchImpl: input.fetchImpl,
  });
}
