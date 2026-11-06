import { AI_PROVIDER_ORIGINS } from "@/lib/ai-activity/providers";
import {
  AI_CAPTURE_METHODS,
  AI_MESSAGE_ROLES,
  AI_PROVIDER_SLUGS,
  type AiCaptureMethod,
  type AiProviderSlug,
  type ValidatedAiConversationCapturePayload,
} from "@/lib/ai-activity/types";
import type {
  ActivityActorKind,
  ActivityEventKind,
  ActivityEvidenceKind,
  PermissionState,
  Reversibility,
  UserVisibility,
  VerificationLevel,
} from "@/lib/activity/types";

export const AI_CAPTURE_MAX_BODY_BYTES = 256 * 1024;
export const AI_CAPTURE_MAX_MESSAGES = 200;
export const AI_CAPTURE_MAX_MESSAGE_CHARS = 8000;
export const AI_CAPTURE_MAX_TOTAL_TEXT_CHARS = 180_000;

const USER_VISIBILITIES: UserVisibility[] = [
  "visible",
  "summary_only",
  "sensitive",
  "hidden",
];

const ACTOR_KINDS: ActivityActorKind[] = [
  "user",
  "sync",
  "assistant",
  "connector",
  "external_service",
  "system",
];

const EVENT_KINDS: ActivityEventKind[] = [
  "request",
  "approval",
  "execution",
  "result",
  "failure",
  "import",
  "context_access",
];

const EVIDENCE_KINDS: ActivityEvidenceKind[] = [
  "user_statement",
  "source_record",
  "system_log",
  "inference",
  "external_document",
];

const VERIFICATION_LEVELS: VerificationLevel[] = [
  "unverified",
  "self_reported",
  "system_logged",
  "source_confirmed",
];

const REVERSIBILITIES: Reversibility[] = [
  "reversible",
  "partially_reversible",
  "irreversible",
  "unknown",
];

const PERMISSION_STATES: PermissionState[] = [
  "not_required",
  "pending",
  "granted",
  "denied",
  "revoked",
  "expired",
];


export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function optionalString(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function isIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function normalizeIsoDate(value: unknown, fallback: string): string | null {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const trimmed = value.trim();
  return isIsoDate(trimmed) ? new Date(trimmed).toISOString() : null;
}

function normalizeOptionalIsoDate(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  return isIsoDate(value) ? new Date(value).toISOString() : null;
}

function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isOriginAllowedForProvider(input: {
  provider: AiProviderSlug;
  origin: string;
  captureMethod: AiCaptureMethod;
}): boolean {
  if (input.captureMethod === "paste_import") return true;
  return AI_PROVIDER_ORIGINS[input.provider].includes(input.origin);
}

function sanitizeScalarMetadata(
  value: unknown,
): Record<string, string | number | boolean | null> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") out[key.slice(0, 80)] = raw.slice(0, 500);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key.slice(0, 80)] = raw;
    else if (typeof raw === "boolean" || raw === null) out[key.slice(0, 80)] = raw;
  }
  return Object.keys(out).length ? out : undefined;
}

function validateMessage(
  raw: unknown,
  capturedAt: string,
): ValidationResult<ValidatedAiConversationCapturePayload["messages"][number]> {
  if (!isRecord(raw)) return { ok: false, error: "Invalid message" };
  if (!isOneOf(raw.role, AI_MESSAGE_ROLES)) {
    return { ok: false, error: "Invalid message role" };
  }

  const text = optionalString(raw.text, AI_CAPTURE_MAX_MESSAGE_CHARS);
  const redactedText = optionalString(raw.redactedText, AI_CAPTURE_MAX_MESSAGE_CHARS);
  if (!text && !redactedText) {
    return { ok: false, error: "Message text required" };
  }

  const sentAt = normalizeOptionalIsoDate(raw.sentAt);
  if (sentAt === null) return { ok: false, error: "Invalid message timestamp" };

  const messageCapturedAt = normalizeIsoDate(raw.capturedAt, capturedAt);
  if (!messageCapturedAt) {
    return { ok: false, error: "Invalid message capture timestamp" };
  }

  const confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0.7;

  return {
    ok: true,
    value: {
      providerMessageId: optionalString(raw.providerMessageId, 200),
      role: raw.role,
      text,
      redactedText,
      redactionStatus: isOneOf(raw.redactionStatus, [
        "client_redacted",
        "server_redacted",
        "already_clean",
      ] as const)
        ? raw.redactionStatus
        : undefined,
      sentAt,
      capturedAt: messageCapturedAt,
      confidence,
      visibility: isOneOf(raw.visibility, USER_VISIBILITIES)
        ? raw.visibility
        : "summary_only",
      metadata: sanitizeScalarMetadata(raw.metadata),
    },
  };
}

export function validateAiConversationCapturePayload(
  raw: unknown,
): ValidationResult<ValidatedAiConversationCapturePayload> {
  if (!isRecord(raw)) return { ok: false, error: "Invalid payload" };
  if (!isOneOf(raw.provider, AI_PROVIDER_SLUGS)) {
    return { ok: false, error: "Invalid provider" };
  }
  if (!isOneOf(raw.captureMethod, AI_CAPTURE_METHODS)) {
    return { ok: false, error: "Invalid capture method" };
  }

  const origin = normalizeOrigin(raw.origin);
  if (!origin) return { ok: false, error: "Invalid origin" };
  if (
    !isOriginAllowedForProvider({
      provider: raw.provider,
      origin,
      captureMethod: raw.captureMethod,
    })
  ) {
    return { ok: false, error: "Origin is not allowed for provider" };
  }

  const providerConversationId = optionalString(raw.providerConversationId, 300);
  if (!providerConversationId) {
    return { ok: false, error: "Conversation id required" };
  }

  const capturedAt = normalizeIsoDate(raw.capturedAt, new Date().toISOString());
  if (!capturedAt) return { ok: false, error: "Invalid capture timestamp" };

  const startedAt = normalizeOptionalIsoDate(raw.startedAt);
  const lastMessageAt = normalizeOptionalIsoDate(raw.lastMessageAt);
  if (startedAt === null || lastMessageAt === null) {
    return { ok: false, error: "Invalid conversation timestamp" };
  }

  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    return { ok: false, error: "At least one message is required" };
  }
  if (raw.messages.length > AI_CAPTURE_MAX_MESSAGES) {
    return { ok: false, error: "Too many messages" };
  }

  const messages: ValidatedAiConversationCapturePayload["messages"] = [];
  let totalText = 0;
  for (const rawMessage of raw.messages) {
    const message = validateMessage(rawMessage, capturedAt);
    if (!message.ok) return message;
    totalText += (message.value.text ?? message.value.redactedText ?? "").length;
    if (totalText > AI_CAPTURE_MAX_TOTAL_TEXT_CHARS) {
      return { ok: false, error: "Capture text is too large" };
    }
    messages.push(message.value);
  }

  const proof = isRecord(raw.proof) ? raw.proof : {};
  const sourceKind =
    proof.sourceKind === "paste_import" ||
    proof.sourceKind === "future_connector" ||
    proof.sourceKind === "chrome_extension"
      ? proof.sourceKind
      : raw.captureMethod === "extension"
        ? "chrome_extension"
        : "paste_import";

  return {
    ok: true,
    value: {
      provider: raw.provider,
      providerConversationId,
      idempotencyKey:
        optionalString(raw.idempotencyKey, 200) ??
        `${raw.provider}:${providerConversationId}`,
      title: optionalString(raw.title, 200),
      origin,
      capturedAt,
      startedAt,
      lastMessageAt,
      captureMethod: raw.captureMethod,
      visibility: isOneOf(raw.visibility, USER_VISIBILITIES)
        ? raw.visibility
        : "summary_only",
      summary: optionalString(raw.summary, 1000),
      messages,
      proof: {
        sourceKind,
        connectionId: optionalString(proof.connectionId, 200) ?? "owner-secret",
        actorKind: isOneOf(proof.actorKind, ACTOR_KINDS)
          ? proof.actorKind
          : "assistant",
        eventKind: isOneOf(proof.eventKind, EVENT_KINDS)
          ? proof.eventKind
          : "import",
        evidenceKind: isOneOf(proof.evidenceKind, EVIDENCE_KINDS)
          ? proof.evidenceKind
          : "source_record",
        verification: isOneOf(proof.verification, VERIFICATION_LEVELS)
          ? proof.verification
          : "system_logged",
        reversibility: isOneOf(proof.reversibility, REVERSIBILITIES)
          ? proof.reversibility
          : "unknown",
        permissionScope:
          optionalString(proof.permissionScope, 120) ?? "ai_activity.capture.write",
        permissionState: isOneOf(proof.permissionState, PERMISSION_STATES)
          ? proof.permissionState
          : "granted",
        summary: optionalString(proof.summary, 500) ?? "Captured AI conversation.",
      },
    },
  };
}
