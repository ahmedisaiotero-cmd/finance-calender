import { redactAiTranscriptText } from "@/lib/ai-activity/redaction";
import { primaryOriginForProvider } from "@/lib/ai-activity/providers";
import {
  AI_PROVIDER_SLUGS,
  type AiConversationCapturePayload,
  type AiMessageRole,
  type AiProviderSlug,
} from "@/lib/ai-activity/types";

const ROLE_ALIASES: Record<string, AiMessageRole> = {
  user: "user",
  you: "user",
  human: "user",
  me: "user",
  assistant: "assistant",
  chatgpt: "assistant",
  claude: "assistant",
  grok: "assistant",
  cursor: "assistant",
  gemini: "assistant",
  system: "system",
  tool: "tool",
};

const ROLE_LINE =
  /^(user|you|human|me|assistant|chatgpt|claude|grok|cursor|gemini|system|tool)\s*:\s*(.*)$/i;

export function isAiProviderSlug(value: string): value is AiProviderSlug {
  return (AI_PROVIDER_SLUGS as readonly string[]).includes(value);
}

export function fingerprintPasteText(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ").slice(0, 4000);
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function parsePastedTranscript(text: string): Array<{
  role: AiMessageRole;
  text: string;
}> {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];

  const lines = trimmed.split("\n");
  const messages: Array<{ role: AiMessageRole; text: string }> = [];
  let current: { role: AiMessageRole; parts: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const value = current.parts.join("\n").trim();
    if (value) messages.push({ role: current.role, text: value });
    current = null;
  };

  for (const line of lines) {
    const match = line.match(ROLE_LINE);
    if (match) {
      flush();
      const role = ROLE_ALIASES[match[1].toLowerCase()] ?? "unknown";
      current = { role, parts: match[2] ? [match[2]] : [] };
      continue;
    }
    if (!current) current = { role: "unknown", parts: [line] };
    else current.parts.push(line);
  }
  flush();

  if (messages.length === 0) {
    return [{ role: "user", text: trimmed }];
  }

  if (messages.length === 1 && messages[0].role === "unknown") {
    return [{ role: "user", text: messages[0].text }];
  }

  return messages.map((message) =>
    message.role === "unknown" ? { ...message, role: "user" } : message,
  );
}

export function titleFromPastedMessages(
  messages: Array<{ role: AiMessageRole; text: string }>,
  fallback = "Pasted conversation",
): string {
  const firstUseful =
    messages.find((message) => message.role === "user") ?? messages[0];
  if (!firstUseful) return fallback;
  const firstLine = firstUseful.text.split("\n").find((line) => line.trim());
  if (!firstLine) return fallback;
  const cleaned = firstLine.replace(/\s+/g, " ").trim();
  return cleaned.length > 80 ? `${cleaned.slice(0, 77).trimEnd()}...` : cleaned;
}

export function buildPasteImportPayload(input: {
  provider: AiProviderSlug;
  transcript: string;
  title?: string;
  origin?: string;
  capturedAt?: string;
}):
  | { ok: true; payload: AiConversationCapturePayload }
  | { ok: false; error: string } {
  const transcript = input.transcript.replace(/\r\n/g, "\n").trim();
  if (!transcript) return { ok: false, error: "Paste a conversation first" };
  if (!isAiProviderSlug(input.provider)) {
    return { ok: false, error: "Invalid provider" };
  }

  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const parsed = parsePastedTranscript(transcript);
  if (parsed.length === 0) {
    return { ok: false, error: "Paste a conversation first" };
  }

  const messages = parsed.map((message) => {
    const redacted = redactAiTranscriptText(message.text);
    return {
      role: message.role,
      text: redacted.text,
      redactedText: redacted.text,
      redactionStatus: redacted.redacted
        ? ("client_redacted" as const)
        : ("already_clean" as const),
      capturedAt,
    };
  });

  const title = input.title?.trim() || titleFromPastedMessages(messages);
  const fingerprint = fingerprintPasteText(transcript);

  return {
    ok: true,
    payload: {
      provider: input.provider,
      providerConversationId: `paste:${input.provider}:${fingerprint}`,
      idempotencyKey: `paste:${input.provider}:${fingerprint}`,
      title,
      origin: input.origin?.trim() || primaryOriginForProvider(input.provider),
      capturedAt,
      captureMethod: "paste_import",
      visibility: "summary_only",
      summary: title,
      messages,
      proof: {
        sourceKind: "paste_import",
        connectionId: "paste-import",
        actorKind: "user",
        eventKind: "import",
        evidenceKind: "user_statement",
        verification: "self_reported",
        permissionScope: "ai_activity.capture.write",
        permissionState: "granted",
        summary: title,
      },
    },
  };
}
