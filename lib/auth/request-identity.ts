import type { SessionUser } from "@/lib/auth/session";
import { getSessionUser } from "@/lib/auth/session";
import { isSyncDemoMode } from "@/lib/auth/demo-mode";
import {
  ensureUserAndWorkspace,
  getDemoWorkspace,
} from "@/lib/db/workspace";
import { isDatabaseConfigured } from "@/lib/prisma";

export type RequestIdentityUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export type RequestIdentityWorkspace = {
  id: string;
  name: string;
};

export type RequestIdentity = {
  mode: "authenticated" | "demo";
  user: RequestIdentityUser;
  workspace: RequestIdentityWorkspace;
};

export type IdentityAccessDecision =
  | { ok: true; mode: "authenticated"; session: SessionUser }
  | { ok: true; mode: "demo" }
  | { ok: false; status: 401; error: string };

/**
 * Pure access decision for API identity. Callers must still provision
 * Prisma user/workspace for authenticated mode.
 */
export function resolveIdentityAccess(input: {
  session: SessionUser | null;
  demoMode: boolean;
}): IdentityAccessDecision {
  if (input.session?.id) {
    return { ok: true, mode: "authenticated", session: input.session };
  }

  if (input.demoMode) {
    return { ok: true, mode: "demo" };
  }

  return {
    ok: false,
    status: 401,
    error: "Unauthorized",
  };
}

export class RequestIdentityError extends Error {
  readonly status = 401 as const;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "RequestIdentityError";
  }
}

export class DatabaseUnavailableError extends Error {
  readonly status = 503 as const;

  constructor(message = "DATABASE_URL is not configured") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

/**
 * Trusted server identity for user-owned API routes.
 * Ownership always comes from the session (or explicit non-production demo).
 * Caller-supplied userId/ownerId/workspaceId must never override this.
 */
export async function requireRequestIdentity(): Promise<RequestIdentity> {
  const session = await getSessionUser();
  const access = resolveIdentityAccess({
    session,
    demoMode: isSyncDemoMode(),
  });

  if (!access.ok) {
    throw new RequestIdentityError(access.error);
  }

  if (!isDatabaseConfigured()) {
    throw new DatabaseUnavailableError();
  }

  if (access.mode === "authenticated") {
    const { user, workspace } = await ensureUserAndWorkspace(access.session);
    return {
      mode: "authenticated",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
    };
  }

  const { user, workspace } = await getDemoWorkspace();
  return {
    mode: "demo",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
    },
  };
}
