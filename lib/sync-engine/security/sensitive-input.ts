export type SensitiveInputKind =
  | "password"
  | "ssn"
  | "credit_card"
  | "api_key"
  | "bank_login"
  | "secret_token"
  | "prompt_injection";

export type SensitiveInputDetection = {
  sensitive: boolean;
  kind: SensitiveInputKind | null;
  reason: string;
};

const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;
const CREDIT_CARD_PATTERN =
  /\b(?:\d[ -]*?){13,19}\b/;
const API_KEY_PATTERN =
  /\b(?:sk-(?:test|live)-[a-z0-9_-]+|api[_ -]?key\s*[:=]\s*[a-z0-9_-]{6,})\b/i;
const PROMPT_INJECTION_PATTERN =
  /\b(ignore previous instructions|pretend consent|override (?:the )?rules|store this secret)\b/i;
const SECRET_TOKEN_PATTERN =
  /\b(secret token|private token|access token|auth token|bearer token)\b/i;
const PASSWORD_VALUE_PATTERN =
  /\b(password|passcode|login)\b[^.?!\n]{0,40}\b(is|:|=|\/)\s*[^\s.?!]{4,}/i;
const BANK_LOGIN_PATTERN =
  /\b(bank login|bank username|bank password|online banking|routing login)\b/i;

function looksLikeCreditCard(text: string) {
  const match = text.match(CREDIT_CARD_PATTERN)?.[0];
  if (!match) return false;
  const digits = match.replace(/\D/g, "");
  return digits.length >= 13 && digits.length <= 19;
}

export function detectSensitiveInput(text: string): SensitiveInputDetection {
  const normalized = text.trim();
  if (!normalized) {
    return { sensitive: false, kind: null, reason: "No sensitive input detected." };
  }

  if (SSN_PATTERN.test(normalized)) {
    return {
      sensitive: true,
      kind: "ssn",
      reason: "Input contains a Social Security number.",
    };
  }

  if (looksLikeCreditCard(normalized)) {
    return {
      sensitive: true,
      kind: "credit_card",
      reason: "Input contains a payment card number.",
    };
  }

  if (API_KEY_PATTERN.test(normalized)) {
    return {
      sensitive: true,
      kind: "api_key",
      reason: "Input contains an API key or credential.",
    };
  }

  if (BANK_LOGIN_PATTERN.test(normalized) && PASSWORD_VALUE_PATTERN.test(normalized)) {
    return {
      sensitive: true,
      kind: "bank_login",
      reason: "Input contains banking login credentials.",
    };
  }

  if (PASSWORD_VALUE_PATTERN.test(normalized)) {
    return {
      sensitive: true,
      kind: "password",
      reason: "Input contains a password or login secret.",
    };
  }

  if (SECRET_TOKEN_PATTERN.test(normalized)) {
    return {
      sensitive: true,
      kind: "secret_token",
      reason: "Input asks Sync to store a secret token.",
    };
  }

  if (PROMPT_INJECTION_PATTERN.test(normalized) && /\b(secret|password|token|key)\b/i.test(normalized)) {
    return {
      sensitive: true,
      kind: "prompt_injection",
      reason: "Input tries to override policy while storing a secret.",
    };
  }

  return { sensitive: false, kind: null, reason: "No sensitive input detected." };
}

export const SENSITIVE_INPUT_PLACEHOLDER = "[sensitive input withheld]";
