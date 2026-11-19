/**
 * Encrypt legacy plaintext capture rows in place.
 * Safe to re-run: already-prefixed values are left unchanged.
 */

import type { PrismaClient } from "@prisma/client";

import {
  encryptCaptureTextRequired,
  isEncryptedCaptureText,
  parseCaptureEncryptionKey,
} from "@/lib/crypto/capture-at-rest";

type CaptureEnv = NodeJS.ProcessEnv | Record<string, string | undefined>;

export type CapturePlaintextMigrationCounts = {
  messages: number;
  conversations: number;
  activityEvents: number;
  chatMessages: number;
};

export async function migratePlaintextCaptureRows(
  db: PrismaClient,
  env: CaptureEnv = process.env,
): Promise<CapturePlaintextMigrationCounts> {
  const parsed = parseCaptureEncryptionKey(env);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  const counts: CapturePlaintextMigrationCounts = {
    messages: 0,
    conversations: 0,
    activityEvents: 0,
    chatMessages: 0,
  };

  const messages = await db.aiMessage.findMany({
    select: { id: true, text: true, redactedText: true },
  });
  for (const message of messages) {
    const text = isEncryptedCaptureText(message.text)
      ? message.text
      : encryptCaptureTextRequired(message.text, env);
    const redactedText = isEncryptedCaptureText(message.redactedText)
      ? message.redactedText
      : encryptCaptureTextRequired(message.redactedText, env);
    if (text !== message.text || redactedText !== message.redactedText) {
      await db.aiMessage.update({
        where: { id: message.id },
        data: { text, redactedText },
      });
      counts.messages += 1;
    }
  }

  const conversations = await db.aiConversation.findMany({
    select: { id: true, title: true, summary: true },
  });
  for (const conversation of conversations) {
    const title =
      conversation.title == null || isEncryptedCaptureText(conversation.title)
        ? conversation.title
        : encryptCaptureTextRequired(conversation.title, env);
    const summary =
      conversation.summary == null || isEncryptedCaptureText(conversation.summary)
        ? conversation.summary
        : encryptCaptureTextRequired(conversation.summary, env);
    if (title !== conversation.title || summary !== conversation.summary) {
      await db.aiConversation.update({
        where: { id: conversation.id },
        data: { title, summary },
      });
      counts.conversations += 1;
    }
  }

  const events = await db.aiActivityEvent.findMany({
    select: { id: true, summary: true },
  });
  for (const event of events) {
    if (isEncryptedCaptureText(event.summary)) continue;
    await db.aiActivityEvent.update({
      where: { id: event.id },
      data: { summary: encryptCaptureTextRequired(event.summary, env) },
    });
    counts.activityEvents += 1;
  }

  const chatMessages = await db.syncChatMessage.findMany({
    select: { id: true, content: true },
  });
  for (const message of chatMessages) {
    if (isEncryptedCaptureText(message.content)) continue;
    await db.syncChatMessage.update({
      where: { id: message.id },
      data: { content: encryptCaptureTextRequired(message.content, env) },
    });
    counts.chatMessages += 1;
  }

  return counts;
}
