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

const CHAT_RETRY_WINDOW_MS = 20_000;

export function resolveChatTurnPersistence(input: {
  lastUser?: { content: string; createdAtMs: number } | null;
  lastAfterUser?: { role: string } | null;
  userText: string;
  nowMs: number;
}): "insert_both" | "insert_sync_only" | "skip" {
  if (
    input.lastUser &&
    input.lastUser.content === input.userText &&
    input.nowMs - input.lastUser.createdAtMs < CHAT_RETRY_WINDOW_MS
  ) {
    if (input.lastAfterUser?.role === "sync") return "skip";
    return "insert_sync_only";
  }
  return "insert_both";
}

export async function saveChatTurn(
  userId: string,
  userText: string,
  reply: string,
) {
  if (!isDatabaseConfigured()) return;

  const lastUser = await prisma.syncChatMessage.findFirst({
    where: { userId, role: "user" },
    orderBy: { createdAt: "desc" },
  });

  const lastAfterUser = lastUser
    ? await prisma.syncChatMessage.findFirst({
        where: { userId, createdAt: { gt: lastUser.createdAt } },
        orderBy: { createdAt: "asc" },
      })
    : null;

  const action = resolveChatTurnPersistence({
    lastUser: lastUser
      ? { content: lastUser.content, createdAtMs: lastUser.createdAt.getTime() }
      : null,
    lastAfterUser: lastAfterUser ? { role: lastAfterUser.role } : null,
    userText,
    nowMs: Date.now(),
  });

  if (action === "skip") return;
  if (action === "insert_sync_only") {
    await appendChatMessage(userId, "sync", reply);
    return;
  }

  await prisma.$transaction([
    prisma.syncChatMessage.create({
      data: { userId, role: "user", content: userText },
    }),
    prisma.syncChatMessage.create({
      data: { userId, role: "sync", content: reply },
    }),
  ]);
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
