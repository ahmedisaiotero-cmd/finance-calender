import {
  authenticateOwnerSecret,
  readPresentedSecret,
} from "@/lib/auth/owner-secret";
import {
  DatabaseUnavailableError,
  RequestIdentityError,
  requireRequestIdentity,
} from "@/lib/auth/request-identity";

export type PairOwnerIdentity = {
  ownerId: string;
  ownerEmail: string;
};

export type PairOwnerAuthResult =
  | { ok: true; owner: PairOwnerIdentity; kind: "session" | "owner_secret" }
  | { ok: false; status: 401 | 503; error: string };

export type AuthenticatePairOwner = (
  request: Request,
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
) => Promise<PairOwnerAuthResult>;

/**
 * Prefer a signed-in session. Owner secret remains a lab/dev fallback when
 * a secret is actually presented, so existing pairing tests keep working.
 */
export const authenticatePairOwner: AuthenticatePairOwner = async (
  request,
  env,
) => {
  const presented = readPresentedSecret(request);
  if (presented) {
    const owner = authenticateOwnerSecret(request, env);
    if (!owner.ok) {
      return { ok: false, status: owner.status, error: owner.error };
    }
    return {
      ok: true,
      owner: { ownerId: owner.ownerId, ownerEmail: owner.ownerEmail },
      kind: "owner_secret",
    };
  }

  try {
    const identity = await requireRequestIdentity();
    return {
      ok: true,
      owner: {
        ownerId: identity.user.id,
        ownerEmail: identity.user.email || "unknown@sync.local",
      },
      kind: "session",
    };
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return { ok: false, status: 503, error: error.message };
    }
    if (error instanceof RequestIdentityError) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }
    return { ok: false, status: 401, error: "Unauthorized" };
  }
};
