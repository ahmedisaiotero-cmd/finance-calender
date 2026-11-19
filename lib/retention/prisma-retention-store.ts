import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { RetentionStore } from "@/lib/retention/enforce-retention";

export function prismaRetentionStore(db: PrismaClient = prisma): RetentionStore {
  return {
    async deleteExpiredPairingCodes(now) {
      const result = await db.aiPairingCode.deleteMany({
        where: {
          OR: [{ expiresAt: { lte: now } }, { consumedAt: { not: null } }],
        },
      });
      return result.count;
    },
    async deleteExpiredDevices(cutoff) {
      const result = await db.aiExtensionDevice.deleteMany({
        where: {
          OR: [
            { expiresAt: { lte: cutoff } },
            { revokedAt: { lte: cutoff } },
          ],
        },
      });
      return result.count;
    },
    async deleteExpiredRateLimitWindows(cutoff) {
      const result = await db.chatRateLimitWindow.deleteMany({
        where: { windowStart: { lte: cutoff } },
      });
      return result.count;
    },
    async deleteExpiredCaptures(cutoff) {
      const result = await db.aiConversation.deleteMany({
        where: { capturedAt: { lte: cutoff } },
      });
      return result.count;
    },
  };
}
