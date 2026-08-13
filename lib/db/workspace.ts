import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const DEMO_USER_EMAIL = "demo@finance-calendar.local";

type UserWithWorkspaces = {
  id: string;
  email: string;
  name: string | null;
  workspaces: Array<{ id: string; name: string }>;
};

function pickWorkspace(user: UserWithWorkspaces) {
  const workspace = user.workspaces[0];
  if (!workspace) {
    throw new Error("No workspace found for user");
  }
  return { user, workspace };
}

/**
 * Demo-only workspace. Must not be called from production API paths.
 * Callers must gate with isSyncDemoMode() first.
 */
export function assertDemoWorkspaceAllowed(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV === "production") {
    throw new Error("Demo workspace is not available in production");
  }
}

export async function getDemoWorkspace() {
  assertDemoWorkspaceAllowed();

  let user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    include: {
      workspaces: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_USER_EMAIL,
        name: "Demo",
        workspaces: {
          create: { name: "Personal" },
        },
      },
      include: {
        workspaces: { take: 1, orderBy: { createdAt: "asc" } },
      },
    });
  }

  return pickWorkspace(user);
}

/**
 * @deprecated Use requireRequestIdentity() / getDemoWorkspace() / ensureUserAndWorkspace().
 * Kept as an explicit alias for seed scripts only — not for production API routes.
 */
export async function getDefaultWorkspace() {
  return getDemoWorkspace();
}

/**
 * Ensure a Prisma User + personal Workspace exist for the authenticated
 * Supabase session. Uses the session id as User.id so SyncProfile FK works.
 */
export async function ensureUserAndWorkspace(session: SessionUser) {
  const existing = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      workspaces: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  if (existing) {
    if (existing.workspaces.length > 0) {
      return pickWorkspace(existing);
    }

    const workspace = await prisma.workspace.create({
      data: {
        ownerId: existing.id,
        name: "Personal",
      },
    });

    return {
      user: existing,
      workspace: { id: workspace.id, name: workspace.name },
    };
  }

  const email =
    session.email?.trim() || `${session.id}@users.sync.local`;

  // Avoid unique-email collisions with an unrelated legacy row.
  const emailOwner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  const safeEmail =
    emailOwner && emailOwner.id !== session.id
      ? `${session.id}@users.sync.local`
      : email;

  const created = await prisma.user.create({
    data: {
      id: session.id,
      email: safeEmail,
      name: null,
      workspaces: {
        create: { name: "Personal" },
      },
    },
    include: {
      workspaces: { take: 1, orderBy: { createdAt: "asc" } },
    },
  });

  return pickWorkspace(created);
}
