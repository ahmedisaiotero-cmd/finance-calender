import assert from "node:assert/strict";

import { handleAiActivityIngestPost } from "@/lib/api/ai-activity-ingest-handler";
import { prepareAiCaptureForPersistence } from "@/lib/ai-activity/prepare-capture";
import { validateAiConversationCapturePayload } from "@/lib/ai-activity/validation";
import {
  CAPTURE_ENCRYPTION_KEY_ENV,
  CAPTURE_ENCRYPTION_PREFIX,
  CaptureEncryptionError,
  assertWritableCaptureEncryption,
  decryptCaptureText,
  encryptCaptureText,
  isEncryptedCaptureText,
} from "@/lib/crypto/capture-at-rest";
import { migratePlaintextCaptureRows } from "@/lib/crypto/migrate-capture-plaintext";
import { exportUserData } from "@/lib/db/export-user-data";

const TEST_KEY = "a".repeat(64);
const env = { [CAPTURE_ENCRYPTION_KEY_ENV]: TEST_KEY };

{
  const plaintext = "Rent is due Friday. Card 4242 4242 4242 4242";
  const encrypted = encryptCaptureText(plaintext, env);
  assert.equal(typeof encrypted, "string");
  assert.equal(isEncryptedCaptureText(encrypted), true);
  assert.equal(encrypted?.startsWith(CAPTURE_ENCRYPTION_PREFIX), true);
  assert.equal(encrypted?.includes("4242"), false);
  assert.equal(encrypted?.includes("Rent is due"), false);
  assert.equal(decryptCaptureText(encrypted, env), plaintext);

  const again = encryptCaptureText(encrypted, env);
  assert.equal(again, encrypted);
}

{
  const first = encryptCaptureText("Flight at 6:00 AM.", env);
  const second = encryptCaptureText("Flight at 6:00 AM.", env);
  assert.notEqual(first, second);
  assert.equal(decryptCaptureText(first, env), decryptCaptureText(second, env));
}

{
  assert.equal(decryptCaptureText("legacy plaintext summary", env), "legacy plaintext summary");
  assert.equal(decryptCaptureText(null, env), null);
}

{
  const prod = { NODE_ENV: "production" };
  const ready = assertWritableCaptureEncryption(prod);
  assert.equal(ready.ok, false);
  assert.throws(
    () => encryptCaptureText("secret transcript", prod),
    (error: unknown) => error instanceof CaptureEncryptionError,
  );
}

{
  const validated = validateAiConversationCapturePayload({
    provider: "chatgpt",
    providerConversationId: "thread-enc",
    idempotencyKey: "enc-1",
    origin: "https://chatgpt.com/c/1",
    capturedAt: "2026-11-19T12:00:00.000Z",
    captureMethod: "extension",
    title: "Budget plan",
    messages: [
      { role: "user", text: "Use card 4242 4242 4242 4242 for rent." },
    ],
  });
  assert.equal(validated.ok, true);
  if (!validated.ok) throw new Error("expected valid capture");
  const prepared = prepareAiCaptureForPersistence(validated.value);
  const redacted = prepared.messages[0]?.redactedText ?? "";
  assert.equal(redacted.includes("4242"), false);

  const encrypted = encryptCaptureText(redacted, env);
  assert.equal(isEncryptedCaptureText(encrypted), true);
  assert.equal(decryptCaptureText(encrypted, env), redacted);
}

async function main() {
  const encryptedRedacted = encryptCaptureText("Use the safer budget plan.", env);
  const encryptedSummary = encryptCaptureText("Budget conversation.", env);
  const encryptedEvent = encryptCaptureText("Captured from chatgpt.", env);
  const encryptedChat = encryptCaptureText("What did I save?", env);
  assert.ok(encryptedRedacted && encryptedSummary && encryptedEvent && encryptedChat);

  const exported = await exportUserData(
    "user-enc",
    {
      user: {
        findUnique: async () => ({
          id: "user-enc",
          email: "owner@example.com",
          name: "Owner",
          timezone: "UTC",
          birthYear: 1990,
          legalPolicyVersion: "2026-11-19",
          legalAcceptedAt: new Date("2026-11-19T00:00:00.000Z"),
          privacyAcceptedAt: new Date("2026-11-19T00:00:00.000Z"),
          termsAcceptedAt: new Date("2026-11-19T00:00:00.000Z"),
          ageConfirmedAt: new Date("2026-11-19T00:00:00.000Z"),
          createdAt: new Date("2026-11-19T00:00:00.000Z"),
        }),
      },
      syncProfile: { findUnique: async () => null },
      aiExtensionDevice: { findMany: async () => [] },
      aiPairingCode: { findMany: async () => [] },
      aiConversation: {
        findMany: async () => [
          {
            id: "c1",
            title: encryptCaptureText("Budget plan", env),
            summary: encryptedSummary,
            origin: "https://chatgpt.com/c/1",
            capturedAt: new Date("2026-11-19T12:00:00.000Z"),
            captureMethod: "extension",
            visibility: "summary_only",
            messages: [
              {
                role: "user",
                redactedText: encryptedRedacted,
                sentAt: new Date("2026-11-19T12:00:00.000Z"),
                capturedAt: new Date("2026-11-19T12:00:00.000Z"),
              },
            ],
            activityEvents: [
              {
                kind: "imported",
                summary: encryptedEvent,
                timestamp: new Date("2026-11-19T12:00:00.000Z"),
                verification: "unverified",
              },
            ],
          },
        ],
      },
      syncChatMessage: {
        findMany: async () => [
          {
            role: "user",
            content: encryptedChat,
            createdAt: new Date("2026-11-19T12:01:00.000Z"),
          },
        ],
      },
    } as never,
    env,
  );

  assert.ok(exported);
  assert.equal(exported?.conversations[0]?.title, "Budget plan");
  assert.equal(exported?.conversations[0]?.summary, "Budget conversation.");
  assert.equal(
    exported?.conversations[0]?.messages[0]?.redactedText,
    "Use the safer budget plan.",
  );
  assert.equal(exported?.inAppChat[0]?.content, "What did I save?");
  assert.equal(JSON.stringify(exported).includes(CAPTURE_ENCRYPTION_PREFIX), false);

  const updated: string[] = [];
  const migrated = await migratePlaintextCaptureRows(
    {
      aiMessage: {
        findMany: async () => [
          { id: "m1", text: "plain text", redactedText: "plain redacted" },
        ],
        update: async (args: { where: { id: string }; data: { text: string } }) => {
          updated.push(args.data.text);
          return {};
        },
      },
      aiConversation: {
        findMany: async () => [{ id: "c1", title: "plain title", summary: null }],
        update: async () => ({}),
      },
      aiActivityEvent: {
        findMany: async () => [{ id: "e1", summary: "plain event" }],
        update: async () => ({}),
      },
      syncChatMessage: {
        findMany: async () => [{ id: "chat1", content: "plain chat" }],
        update: async () => ({}),
      },
    } as never,
    env,
  );
  assert.equal(migrated.messages, 1);
  assert.equal(migrated.conversations, 1);
  assert.equal(migrated.activityEvents, 1);
  assert.equal(migrated.chatMessages, 1);
  assert.equal(isEncryptedCaptureText(updated[0]), true);
  assert.equal(decryptCaptureText(updated[0], env), "plain text");

  const ingest = await handleAiActivityIngestPost(
    new Request("http://localhost/api/ai-activity/ingest", {
      method: "POST",
      headers: {
        authorization: "Bearer owner-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        provider: "claude",
        providerConversationId: "t1",
        idempotencyKey: "k1",
        origin: "https://claude.ai/chat/1",
        capturedAt: "2026-11-19T12:00:00.000Z",
        captureMethod: "extension",
        messages: [{ role: "user", text: "hello" }],
      }),
    }),
    {
      env: {
        NODE_ENV: "production",
        SYNC_OWNER_SECRET: "owner-secret",
        SYNC_OWNER_ID: "owner-1",
        SYNC_OWNER_EMAIL: "owner@example.com",
      },
      persistCapture: async () => {
        throw new Error("should not persist without a key");
      },
    },
  );
  assert.equal(ingest.status, 503);
}

main()
  .then(() => {
    console.log("capture-at-rest tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
