import type {
  ActivityEvent,
  ActivityEventKind,
  ActivityEvidence,
  ActivityEvidenceKind,
  ActivityActorKind,
  PermissionState,
  Reversibility,
  UserVisibility,
  VerificationLevel,
} from "@/lib/activity/types";

export const AI_PROVIDER_SLUGS = [
  "chatgpt",
  "claude",
  "grok",
  "cursor",
  "gemini",
  "paste_import",
] as const;

export type AiProviderSlug = (typeof AI_PROVIDER_SLUGS)[number];

export const AI_MESSAGE_ROLES = [
  "user",
  "assistant",
  "tool",
  "system",
  "unknown",
] as const;

export type AiMessageRole = (typeof AI_MESSAGE_ROLES)[number];

export const AI_CAPTURE_METHODS = ["extension", "paste_import"] as const;

export type AiCaptureMethod = (typeof AI_CAPTURE_METHODS)[number];

export const AI_REDACTION_STATUSES = [
  "client_redacted",
  "server_redacted",
  "already_clean",
] as const;

export type AiRedactionStatus = (typeof AI_REDACTION_STATUSES)[number];

export const AI_LINK_RELATIONSHIPS = [
  "caused",
  "informed",
  "followed_up",
  "implemented",
  "contradicted",
  "refined",
  "referenced",
  "related",
  "supersedes",
] as const;

export type AiLinkRelationship = (typeof AI_LINK_RELATIONSHIPS)[number];

export const AI_LINK_BASES = [
  "explicit_reference",
  "same_artifact",
  "temporal_sequence",
  "user_confirmed",
  "inferred",
] as const;

export type AiLinkBasis = (typeof AI_LINK_BASES)[number];

export type AiProvider = {
  id: string;
  slug: AiProviderSlug;
  displayName: string;
  supportedOrigins: string[];
  createdAt: string;
};

export type AiCaptureSourceKind =
  | "chrome_extension"
  | "paste_import"
  | "future_connector";

export type AiCaptureSource = {
  id: string;
  ownerId: string;
  kind: AiCaptureSourceKind;
  providerId: string;
  external: boolean;
  connectionId: string;
  permissionState: PermissionState;
  lastSeenAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type AiConversation = {
  id: string;
  ownerId: string;
  providerId: string;
  sourceId: string;
  providerConversationRef: string;
  idempotencyKey: string | null;
  title: string | null;
  origin: string;
  startedAt: string | null;
  lastMessageAt: string | null;
  capturedAt: string;
  captureMethod: AiCaptureMethod;
  visibility: UserVisibility;
  rawTextRef: null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiMessage = {
  id: string;
  conversationId: string;
  providerMessageRef: string;
  role: AiMessageRole;
  text: string;
  redactedText: string;
  redactionStatus: AiRedactionStatus;
  sentAt: string | null;
  capturedAt: string;
  confidence: number;
  visibility: UserVisibility;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AiActivityRecord = Omit<ActivityEvent, "source"> & {
  ownerId: string;
  conversationId: string;
  messageId?: string | null;
  providerId: string;
  sourceId: string;
  source: ActivityEvent["source"];
};

export type AiArtifactKind =
  | "code"
  | "document"
  | "plan"
  | "advice"
  | "image"
  | "link"
  | "other";

export type AiArtifact = {
  id: string;
  ownerId: string;
  providerId: string;
  conversationId: string;
  activityEventId: string | null;
  kind: AiArtifactKind;
  title: string;
  summary: string | null;
  artifactRef: string | null;
  createdAt: string;
  visibility: UserVisibility;
};

export type AiLink = {
  id: string;
  ownerId: string;
  fromEventId: string;
  toEventId: string;
  relationship: AiLinkRelationship;
  confidence: number;
  basis: AiLinkBasis;
  evidence: ActivityEvidence[];
  createdAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
};

export type AiCaptureMessagePayload = {
  providerMessageId?: string;
  role: AiMessageRole;
  text?: string;
  redactedText?: string;
  redactionStatus?: AiRedactionStatus;
  sentAt?: string;
  capturedAt?: string;
  confidence?: number;
  visibility?: UserVisibility;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AiCaptureProofPayload = {
  sourceKind?: AiCaptureSourceKind;
  connectionId?: string;
  actorKind?: ActivityActorKind;
  eventKind?: ActivityEventKind;
  evidenceKind?: ActivityEvidenceKind;
  verification?: VerificationLevel;
  reversibility?: Reversibility;
  permissionScope?: string;
  permissionState?: PermissionState;
  summary?: string;
};

export type AiConversationCapturePayload = {
  provider: AiProviderSlug;
  providerConversationId: string;
  idempotencyKey?: string;
  title?: string;
  origin: string;
  capturedAt: string;
  startedAt?: string;
  lastMessageAt?: string;
  captureMethod: AiCaptureMethod;
  visibility?: UserVisibility;
  summary?: string;
  messages: AiCaptureMessagePayload[];
  proof?: AiCaptureProofPayload;
};

export type ValidatedAiConversationCapturePayload =
  AiConversationCapturePayload & {
    idempotencyKey: string;
    visibility: UserVisibility;
    proof: Required<AiCaptureProofPayload>;
    messages: Array<
      Required<
        Pick<
          AiCaptureMessagePayload,
          "role" | "capturedAt" | "confidence" | "visibility"
        >
      > &
        Omit<
          AiCaptureMessagePayload,
          "role" | "capturedAt" | "confidence" | "visibility"
        >
    >;
  };
