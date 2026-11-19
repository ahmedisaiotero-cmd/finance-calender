import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function exportUserData(
  userId: string,
  db: PrismaClient = prisma,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      birthYear: true,
      legalPolicyVersion: true,
      legalAcceptedAt: true,
      privacyAcceptedAt: true,
      termsAcceptedAt: true,
      ageConfirmedAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    return null;
  }

  const [
    profile,
    devices,
    pairingCodes,
    conversations,
    chatMessages,
  ] = await Promise.all([
    db.syncProfile.findUnique({
      where: { userId },
      select: { data: true, updatedAt: true },
    }),
    db.aiExtensionDevice.findMany({
      where: { ownerId: userId },
      select: {
        connectionId: true,
        label: true,
        permissionState: true,
        createdAt: true,
        lastSeenAt: true,
        revokedAt: true,
        expiresAt: true,
      },
    }),
    db.aiPairingCode.findMany({
      where: { ownerId: userId },
      select: {
        createdAt: true,
        expiresAt: true,
        consumedAt: true,
      },
    }),
    db.aiConversation.findMany({
      where: { ownerId: userId },
      orderBy: { capturedAt: "desc" },
      select: {
        id: true,
        title: true,
        summary: true,
        origin: true,
        capturedAt: true,
        captureMethod: true,
        visibility: true,
        messages: {
          select: {
            role: true,
            redactedText: true,
            sentAt: true,
            capturedAt: true,
          },
        },
        activityEvents: {
          select: {
            kind: true,
            summary: true,
            timestamp: true,
            verification: true,
          },
        },
      },
    }),
    db.syncChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true, createdAt: true },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: user,
    profile: profile?.data ?? null,
    devices,
    pairingCodes,
    conversations,
    inAppChat: chatMessages,
  };
}
