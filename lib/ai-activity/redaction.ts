import {
  looksLikeSecret,
  redactSecrets,
  sanitizeDetail,
} from "@/lib/activity/redaction";
import type { AiRedactionStatus } from "@/lib/ai-activity/types";

const REDACTION = "[redacted]";

const AI_TRANSCRIPT_PATTERNS: Array<{
  pattern: RegExp;
  replace: string | ((match: string, ...groups: string[]) => string);
}> = [
  {
    pattern:
      /\b(password|passwd|passcode|pin|secret|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|session[_ -]?token|cookie|authorization)\s*(?:is|:|=)\s*([^\s,;]+)/gi,
    replace: (_match: string, label: string) => `${label}: ${REDACTION}`,
  },
  {
    pattern: /\b(account|routing)\s*(number|#)?\s*[:=]?\s*\d{6,17}\b/gi,
    replace: (_match: string, label: string, suffix: string | undefined) =>
      `${label}${suffix ? ` ${suffix}` : ""}: ${REDACTION}`,
  },
  {
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    replace: REDACTION,
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replace: REDACTION,
  },
];

export function redactAiTranscriptText(text: string): {
  text: string;
  redacted: boolean;
} {
  if (!text) return { text, redacted: false };

  let cleaned = redactSecrets(text);
  for (const { pattern, replace } of AI_TRANSCRIPT_PATTERNS) {
    cleaned =
      typeof replace === "string"
        ? cleaned.replace(pattern, replace)
        : cleaned.replace(pattern, replace);
  }

  return {
    text: cleaned,
    redacted: cleaned !== text,
  };
}

export function resolveAiRedactionStatus(input: {
  originalText: string;
  cleanedText: string;
  clientStatus?: AiRedactionStatus;
}): AiRedactionStatus {
  if (input.cleanedText !== input.originalText) return "server_redacted";
  return input.clientStatus ?? "already_clean";
}

export function sanitizeAiMetadata(
  metadata: Record<string, string | number | boolean | null> | undefined,
) {
  return sanitizeDetail(metadata);
}

export { looksLikeSecret };
