import { createHash } from "node:crypto";

import { createActivityEvent } from "@/lib/activity/activity-event";
import type { ActivityEvent } from "@/lib/activity/types";
import {
  redactAiTranscriptText,
  resolveAiRedactionStatus,
  sanitizeAiMetadata,
} from "@/lib/ai-activity/redaction";
import type {
  AiMessage,
  ValidatedAiConversationCapturePayload,
} from "@/lib/ai-activity/types";

function hashOpaqueRef(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function opaqueProviderConversationRef(input: {
  provider: string;
  providerConversationId: string;
}): string {
  return hashOpaqueRef(`${input.provider}:${input.providerConversationId}`);
}

export function opaqueProviderMessageRef(input: {
  provider: string;
  providerConversationId: string;
  role: string;
  sentAt?: string | null;
  text: string;
  index: number;
  providerMessageId?: string;
}): string {
  return hashOpaqueRef(
    [
      input.provider,
      input.providerConversationId,
      input.providerMessageId ?? input.index,
      input.role,
      input.sentAt ?? "",
      input.text,
    ].join("|"),
  );
}

export type PreparedAiMessage = Omit<AiMessage, "id" | "conversationId">;

export type PreparedAiCapture = {
  provider: ValidatedAiConversationCapturePayload["provider"];
  providerConversationRef: string;
  idempotencyKey: string;
  title?: string;
  origin: string;
  startedAt?: string;
  lastMessageAt?: string;
  capturedAt: string;
  captureMethod: ValidatedAiConversationCapturePayload["captureMethod"];
  visibility: ValidatedAiConversationCapturePayload["visibility"];
  summary?: string;
  source: {
    kind: ValidatedAiConversationCapturePayload["proof"]["sourceKind"];
    connectionId: string;
    external: boolean;
    permissionState: ValidatedAiConversationCapturePayload["proof"]["permissionState"];
  };
  messages: PreparedAiMessage[];
  activityEvent: ActivityEvent;
};

export function prepareAiCaptureForPersistence(
  payload: ValidatedAiConversationCapturePayload,
): PreparedAiCapture {
  const providerConversationRef = opaqueProviderConversationRef({
    provider: payload.provider,
    providerConversationId: payload.providerConversationId,
  });

  const messages = payload.messages.map((message, index) => {
    const originalText = message.text ?? message.redactedText ?? "";
    const preferredText = message.redactedText ?? originalText;
    const redacted = redactAiTranscriptText(preferredText);
    const status = resolveAiRedactionStatus({
      originalText: preferredText,
      cleanedText: redacted.text,
      clientStatus: message.redactionStatus,
    });

    return {
      providerMessageRef: opaqueProviderMessageRef({
        provider: payload.provider,
        providerConversationId: payload.providerConversationId,
        providerMessageId: message.providerMessageId,
        role: message.role,
        sentAt: message.sentAt,
        text: redacted.text,
        index,
      }),
      role: message.role,
      text: redacted.text,
      redactedText: redacted.text,
      redactionStatus: status,
      sentAt: message.sentAt ?? null,
      capturedAt: message.capturedAt ?? payload.capturedAt,
      confidence: message.confidence ?? 0.7,
      visibility:
        status === "server_redacted"
          ? "sensitive"
          : (message.visibility ?? "summary_only"),
      metadata: sanitizeAiMetadata(message.metadata),
    };
  });

  const summarySource =
    payload.summary ??
    payload.proof.summary ??
    payload.title ??
    `${payload.provider} conversation captured.`;
  const summary = redactAiTranscriptText(summarySource).text;

  const activityEvent = createActivityEvent({
    id: hashOpaqueRef(`${payload.idempotencyKey}:import`),
    kind: payload.proof.eventKind,
    actor: {
      kind: payload.proof.actorKind,
      label: payload.provider,
    },
    source: {
      service: payload.provider,
      connectionId: payload.proof.connectionId,
      external: payload.captureMethod === "extension",
    },
    timestamp: payload.capturedAt,
    affectedAreas: [],
    summary,
    evidence: [
      {
        kind: payload.proof.evidenceKind,
        description: `Captured from ${payload.provider} at ${payload.origin}.`,
        sourceRef: providerConversationRef,
        capturedAt: payload.capturedAt,
      },
    ],
    verification: payload.proof.verification,
    confidence: 0.8,
    reversibility: payload.proof.reversibility,
    permission: {
      scope: payload.proof.permissionScope,
      state: payload.proof.permissionState,
    },
    visibility: payload.visibility,
    correlationId: payload.idempotencyKey,
  });

  return {
    provider: payload.provider,
    providerConversationRef,
    idempotencyKey: payload.idempotencyKey,
    title: payload.title
      ? redactAiTranscriptText(payload.title).text
      : undefined,
    origin: payload.origin,
    startedAt: payload.startedAt,
    lastMessageAt: payload.lastMessageAt,
    capturedAt: payload.capturedAt,
    captureMethod: payload.captureMethod,
    visibility: payload.visibility,
    summary,
    source: {
      kind: payload.proof.sourceKind,
      connectionId: payload.proof.connectionId,
      external: payload.captureMethod === "extension",
      permissionState: payload.proof.permissionState,
    },
    messages,
    activityEvent,
  };
}
