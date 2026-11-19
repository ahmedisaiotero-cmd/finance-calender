import assert from "node:assert/strict";

import { appleRevocationRequired } from "@/lib/auth/apple-notifications";
import { decideAppAuthGate } from "@/lib/auth/app-auth-gate";
import {
  ACCOUNT_DELETION_RETAINED,
  deleteUserOwnedData,
} from "@/lib/db/delete-user-account";

function table() {
  const deleted: Array<{ where: Record<string, unknown> }> = [];
  return {
    deleted,
    deleteMany: async (args: { where: Record<string, unknown> }) => {
      deleted.push(args);
      return { count: 1 };
    },
    delete: async (args: { where: Record<string, unknown> }) => {
      deleted.push(args);
      return {};
    },
    findMany: async () => [{ id: "ws-1" }],
  };
}

{
  assert.equal(ACCOUNT_DELETION_RETAINED.length > 0, true);
  assert.match(ACCOUNT_DELETION_RETAINED[0] ?? "", /Apple|law/i);
}

async function main() {
  const aiLink = table();
  const aiArtifact = table();
  const aiActivityEvent = table();
  const aiConversation = table();
  const aiCaptureSource = table();
  const aiExtensionDevice = table();
  const aiPairingCode = table();
  const syncChatMessage = table();
  const chatRateLimitWindow = table();
  const syncProfile = table();
  const transaction = table();
  const event = table();
  const recurringRule = table();
  const budget = table();
  const timelineItem = table();
  const category = table();
  const workspace = table();
  const user = table();

  const db = {
    aiLink,
    aiArtifact,
    aiActivityEvent,
    aiConversation,
    aiCaptureSource,
    aiExtensionDevice,
    aiPairingCode,
    syncChatMessage,
    chatRateLimitWindow,
    syncProfile,
    transaction,
    event,
    recurringRule,
    budget,
    timelineItem,
    category,
    workspace,
    user,
  };

  await deleteUserOwnedData("user-1", {
    prisma: db as never,
  });

  assert.equal(aiConversation.deleted[0]?.where.ownerId, "user-1");
  assert.equal(aiExtensionDevice.deleted[0]?.where.ownerId, "user-1");
  assert.equal(aiPairingCode.deleted[0]?.where.ownerId, "user-1");
  assert.equal(syncProfile.deleted[0]?.where.userId, "user-1");
  assert.equal(syncChatMessage.deleted[0]?.where.userId, "user-1");
  assert.equal(user.deleted[0]?.where.id, "user-1");

  const missing = appleRevocationRequired(true, {});
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.match(missing.error, /APPLE_CLIENT_ID/);

  const skipped = appleRevocationRequired(false, {});
  assert.equal(skipped.ok, true);

  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/settings",
      hasTrustedSession: false,
      supabaseConfigured: true,
      demoMode: false,
    }),
    { action: "redirect", to: "/login" },
  );
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/settings",
      hasTrustedSession: true,
      supabaseConfigured: true,
      demoMode: false,
    }),
    { action: "allow" },
  );
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/auth/callback",
      hasTrustedSession: false,
      supabaseConfigured: true,
      demoMode: false,
    }),
    { action: "allow" },
  );

  console.log("account-deletion tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
