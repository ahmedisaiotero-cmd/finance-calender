import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const ACCOUNT_DELETION_RETAINED = [
  "A minimal record that the account was deleted, if required to finish Sign in with Apple token revocation or to comply with law.",
  "Provider backups, which fall off the backup cycle (typically 30 days or less).",
] as const;

export type DeleteUserAccountDeps = {
  prisma?: PrismaClient;
  deleteAuthUser?: (userId: string) => Promise<void>;
  revokeAppleTokens?: (userId: string) => Promise<void>;
};

export async function deleteUserOwnedData(
  userId: string,
  deps: DeleteUserAccountDeps = {},
): Promise<void> {
  const db = deps.prisma ?? prisma;

  await db.aiLink.deleteMany({ where: { ownerId: userId } });
  await db.aiArtifact.deleteMany({ where: { ownerId: userId } });
  await db.aiActivityEvent.deleteMany({ where: { ownerId: userId } });
  await db.aiConversation.deleteMany({ where: { ownerId: userId } });
  await db.aiCaptureSource.deleteMany({ where: { ownerId: userId } });
  await db.aiExtensionDevice.deleteMany({ where: { ownerId: userId } });
  await db.aiPairingCode.deleteMany({ where: { ownerId: userId } });
  await db.syncChatMessage.deleteMany({ where: { userId } });
  await db.chatRateLimitWindow.deleteMany({ where: { subjectId: userId } });
  await db.syncProfile.deleteMany({ where: { userId } });

  const workspaces = await db.workspace.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  const workspaceIds = workspaces.map((workspace) => workspace.id);
  if (workspaceIds.length > 0) {
    await db.transaction.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await db.event.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await db.recurringRule.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await db.budget.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await db.timelineItem.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await db.category.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await db.workspace.deleteMany({ where: { ownerId: userId } });
  }

  await db.user.delete({ where: { id: userId } });
}

export async function deleteUserAccount(
  userId: string,
  deps: DeleteUserAccountDeps = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (deps.revokeAppleTokens) {
      await deps.revokeAppleTokens(userId);
    }
    await deleteUserOwnedData(userId, deps);
    if (deps.deleteAuthUser) {
      await deps.deleteAuthUser(userId);
    }
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete the account.";
    return { ok: false, error: message };
  }
}
