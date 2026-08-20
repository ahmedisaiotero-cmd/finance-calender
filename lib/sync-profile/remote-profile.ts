import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import type { SyncUserProfile } from "@/lib/sync-profile/user-profile";

export async function loadRemoteProfile(
  userId: string,
): Promise<SyncUserProfile | null> {
  if (!isDatabaseConfigured()) return null;

  const row = await prisma.syncProfile.findUnique({
    where: { userId },
  });

  if (!row) return null;
  return row.data as SyncUserProfile;
}

export async function saveRemoteProfile(
  userId: string,
  profile: SyncUserProfile,
): Promise<SyncUserProfile> {
  if (!isDatabaseConfigured()) return profile;

  const saved = await prisma.syncProfile.upsert({
    where: { userId },
    create: {
      userId,
      data: profile,
    },
    update: {
      data: profile,
    },
  });

  return saved.data as SyncUserProfile;
}

export async function appendChatMessage(
  userId: string,
  role: "user" | "sync",
  content: string,
) {
  if (!isDatabaseConfigured()) return;

  await prisma.syncChatMessage.create({
    data: {
      userId,
      role,
      content,
    },
  });
}

export async function loadChatHistory(userId: string, limit = 40) {
  if (!isDatabaseConfigured()) return [];

  const rows = await prisma.syncChatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.reverse().map((row) => ({
    id: row.id,
    role: row.role as "user" | "sync",
    text: row.content,
  }));
}
