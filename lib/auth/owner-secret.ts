import { timingSafeEqual } from "node:crypto";

export const SYNC_OWNER_SECRET_ENV = "SYNC_OWNER_SECRET";
export const SYNC_OWNER_ID_ENV = "SYNC_OWNER_ID";
export const SYNC_OWNER_EMAIL_ENV = "SYNC_OWNER_EMAIL";

export type OwnerSecretAuthResult =
  | { ok: true; ownerId: string; ownerEmail: string }
  | { ok: false; status: 401 | 503; error: string };

export function readPresentedSecret(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }
  return request.headers.get("x-sync-owner-secret")?.trim() || null;
}

function safeSecretEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function authenticateOwnerSecret(
  request: Request,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): OwnerSecretAuthResult {
  const expected = env[SYNC_OWNER_SECRET_ENV]?.trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: "Owner secret is not configured",
    };
  }

  const presented = readPresentedSecret(request);
  if (!presented || !safeSecretEqual(presented, expected)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return {
    ok: true,
    ownerId: env[SYNC_OWNER_ID_ENV]?.trim() || "sync-owner",
    ownerEmail: env[SYNC_OWNER_EMAIL_ENV]?.trim() || "owner@sync.local",
  };
}
