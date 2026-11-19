import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { AI_PROVIDER_DETAILS } from "@/lib/ai-activity/providers";
import { prepareAiCaptureForPersistence } from "@/lib/ai-activity/prepare-capture";
import type {
  AiProviderSlug,
  ValidatedAiConversationCapturePayload,
} from "@/lib/ai-activity/types";
import {
  decryptCaptureText,
  encryptCaptureTextRequired,
} from "@/lib/crypto/capture-at-rest";

export type AiOwnerIdentity = {
  ownerId: string;
  ownerEmail: string;
};

export type PersistAiCaptureResult = {
  providerId: string;
  sourceId: string;
  conversationId: string;
  activityEventId: string;
  messageIds: string[];
};

type CaptureEnv = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function aiConversationOwnerWhere(ownerId: string, conversationId: string) {
  return { id: conversationId, ownerId };
}

export function aiActivityEventOwnerWhere(ownerId: string, eventId: string) {
  return { id: eventId, ownerId };
}

function decryptStored(value: string | null | undefined, env: CaptureEnv) {
  return decryptCaptureText(value, env);
}

export async function listAiActivityTimelineForOwner(
  ownerId: string,
  env: CaptureEnv = process.env,
) {
  const rows = await prisma.aiConversation.findMany({
    where: { ownerId },
    orderBy: { capturedAt: "desc" },
    take: 40,
    include: {
      provider: { select: { slug: true, displayName: true } },
      _count: { select: { messages: true, activityEvents: true } },
    },
  });

  return rows.map((row) => ({
    ...row,
    title: decryptStored(row.title, env),
    summary: decryptStored(row.summary, env),
  }));
}

export async function ensureOwnerUser(owner: AiOwnerIdentity) {
  return prisma.user.upsert({
    where: { id: owner.ownerId },
    update: {
      email: owner.ownerEmail,
    },
    create: {
      id: owner.ownerId,
      email: owner.ownerEmail,
      name: "Sync owner",
    },
  });
}

async function ensureProvider(slug: AiProviderSlug) {
  const details = AI_PROVIDER_DETAILS[slug];
  return prisma.aiProvider.upsert({
    where: { slug },
    update: {
      displayName: details.displayName,
      supportedOrigins: details.supportedOrigins,
    },
    create: {
      slug,
      displayName: details.displayName,
      supportedOrigins: details.supportedOrigins,
    },
  });
}

function toDate(value: string | undefined | null) {
  return value ? new Date(value) : null;
}

export async function persistAiConversationCapture(input: {
  owner: AiOwnerIdentity;
  payload: ValidatedAiConversationCapturePayload;
  env?: CaptureEnv;
}): Promise<PersistAiCaptureResult> {
  await ensureOwnerUser(input.owner);
  const provider = await ensureProvider(input.payload.provider);
  const prepared = prepareAiCaptureForPersistence(input.payload);
  const env = input.env ?? process.env;
  const encryptedTitle = prepared.title
    ? encryptCaptureTextRequired(prepared.title, env)
    : prepared.title;
  const encryptedSummary = prepared.summary
    ? encryptCaptureTextRequired(prepared.summary, env)
    : prepared.summary;
  const encryptedEventSummary = encryptCaptureTextRequired(
    prepared.activityEvent.summary,
    env,
  );

  const source = await prisma.aiCaptureSource.upsert({
    where: {
      ownerId_providerId_kind_connectionId: {
        ownerId: input.owner.ownerId,
        providerId: provider.id,
        kind: prepared.source.kind,
        connectionId: prepared.source.connectionId,
      },
    },
    update: {
      external: prepared.source.external,
      permissionState: prepared.source.permissionState,
      lastSeenAt: new Date(prepared.capturedAt),
      revokedAt: null,
    },
    create: {
      ownerId: input.owner.ownerId,
      providerId: provider.id,
      kind: prepared.source.kind,
      external: prepared.source.external,
      connectionId: prepared.source.connectionId,
      permissionState: prepared.source.permissionState,
      lastSeenAt: new Date(prepared.capturedAt),
    },
  });

  if (source.revokedAt || source.permissionState === "revoked") {
    throw new Error("AI capture source is revoked");
  }

  const conversation = await prisma.aiConversation.upsert({
    where: {
      ownerId_providerId_providerConversationRef: {
        ownerId: input.owner.ownerId,
        providerId: provider.id,
        providerConversationRef: prepared.providerConversationRef,
      },
    },
    update: {
      sourceId: source.id,
      idempotencyKey: prepared.idempotencyKey,
      title: encryptedTitle,
      origin: prepared.origin,
      startedAt: toDate(prepared.startedAt),
      lastMessageAt: toDate(prepared.lastMessageAt),
      capturedAt: new Date(prepared.capturedAt),
      captureMethod: prepared.captureMethod,
      visibility: prepared.visibility,
      rawTextRef: null,
      summary: encryptedSummary,
    },
    create: {
      ownerId: input.owner.ownerId,
      providerId: provider.id,
      sourceId: source.id,
      providerConversationRef: prepared.providerConversationRef,
      idempotencyKey: prepared.idempotencyKey,
      title: encryptedTitle,
      origin: prepared.origin,
      startedAt: toDate(prepared.startedAt),
      lastMessageAt: toDate(prepared.lastMessageAt),
      capturedAt: new Date(prepared.capturedAt),
      captureMethod: prepared.captureMethod,
      visibility: prepared.visibility,
      rawTextRef: null,
      summary: encryptedSummary,
    },
  });

  const messageIds: string[] = [];
  for (const message of prepared.messages) {
    const saved = await prisma.aiMessage.upsert({
      where: {
        conversationId_providerMessageRef: {
          conversationId: conversation.id,
          providerMessageRef: message.providerMessageRef,
        },
      },
      update: {
        role: message.role,
        text: encryptCaptureTextRequired(message.text, env),
        redactedText: encryptCaptureTextRequired(message.redactedText, env),
        redactionStatus: message.redactionStatus,
        sentAt: toDate(message.sentAt),
        capturedAt: new Date(message.capturedAt),
        confidence: message.confidence,
        visibility: message.visibility,
        metadata: message.metadata as Prisma.InputJsonValue | undefined,
      },
      create: {
        conversationId: conversation.id,
        providerMessageRef: message.providerMessageRef,
        role: message.role,
        text: encryptCaptureTextRequired(message.text, env),
        redactedText: encryptCaptureTextRequired(message.redactedText, env),
        redactionStatus: message.redactionStatus,
        sentAt: toDate(message.sentAt),
        capturedAt: new Date(message.capturedAt),
        confidence: message.confidence,
        visibility: message.visibility,
        metadata: message.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    messageIds.push(saved.id);
  }

  const event = prepared.activityEvent;
  const savedEvent = await prisma.aiActivityEvent.upsert({
    where: {
      ownerId_providerId_correlationId: {
        ownerId: input.owner.ownerId,
        providerId: provider.id,
        correlationId: event.correlationId ?? prepared.idempotencyKey,
      },
    },
    update: {
      conversationId: conversation.id,
      kind: event.kind,
      actorKind: event.actor.kind,
      actorId: event.actor.id,
      actorLabel: event.actor.label,
      sourceId: source.id,
      timestamp: new Date(event.timestamp),
      summary: encryptedEventSummary,
      affectedAreas: event.affectedAreas,
      evidence: event.evidence as unknown as Prisma.InputJsonValue,
      verification: event.verification,
      confidence: event.confidence,
      reversibility: event.reversibility,
      permissionScope: event.permission.scope,
      permissionState: event.permission.state,
      visibility: event.visibility,
      relatedEventIds: event.relatedEventIds ?? undefined,
      detail: event.detail as Prisma.InputJsonValue | undefined,
    },
    create: {
      id: event.id,
      ownerId: input.owner.ownerId,
      conversationId: conversation.id,
      kind: event.kind,
      actorKind: event.actor.kind,
      actorId: event.actor.id,
      actorLabel: event.actor.label,
      providerId: provider.id,
      sourceId: source.id,
      timestamp: new Date(event.timestamp),
      summary: encryptedEventSummary,
      affectedAreas: event.affectedAreas,
      evidence: event.evidence as unknown as Prisma.InputJsonValue,
      verification: event.verification,
      confidence: event.confidence,
      reversibility: event.reversibility,
      permissionScope: event.permission.scope,
      permissionState: event.permission.state,
      visibility: event.visibility,
      correlationId: event.correlationId ?? prepared.idempotencyKey,
      relatedEventIds: event.relatedEventIds ?? undefined,
      detail: event.detail as Prisma.InputJsonValue | undefined,
    },
  });

  return {
    providerId: provider.id,
    sourceId: source.id,
    conversationId: conversation.id,
    activityEventId: savedEvent.id,
    messageIds,
  };
}

export async function getAiConversationForOwner(
  ownerId: string,
  conversationId: string,
  env: CaptureEnv = process.env,
) {
  const row = await prisma.aiConversation.findFirst({
    where: aiConversationOwnerWhere(ownerId, conversationId),
    include: {
      messages: { orderBy: [{ sentAt: "asc" }, { capturedAt: "asc" }] },
      activityEvents: { orderBy: { timestamp: "asc" } },
    },
  });
  if (!row) return null;

  return {
    ...row,
    title: decryptStored(row.title, env),
    summary: decryptStored(row.summary, env),
    messages: row.messages.map((message) => ({
      ...message,
      text: decryptStored(message.text, env) ?? "",
      redactedText: decryptStored(message.redactedText, env) ?? "",
    })),
    activityEvents: row.activityEvents.map((event) => ({
      ...event,
      summary: decryptStored(event.summary, env) ?? "",
    })),
  };
}

export async function listAiConversationsForOwner(
  ownerId: string,
  env: CaptureEnv = process.env,
) {
  const rows = await prisma.aiConversation.findMany({
    where: { ownerId },
    orderBy: { capturedAt: "desc" },
  });
  return rows.map((row) => ({
    ...row,
    title: decryptStored(row.title, env),
    summary: decryptStored(row.summary, env),
  }));
}

export async function deleteAiConversationForOwner(
  ownerId: string,
  conversationId: string,
) {
  return prisma.aiConversation.deleteMany({
    where: aiConversationOwnerWhere(ownerId, conversationId),
  });
}
