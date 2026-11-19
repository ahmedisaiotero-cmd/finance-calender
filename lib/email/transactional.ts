import { LEGAL_OPERATOR } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export const TRANSACTIONAL_TEMPLATES = {
  account_deleted: {
    subject: `Your ${SITE_PRODUCT.name} account was deleted`,
    text: `${SITE_PRODUCT.name} deleted the account for this email. Captures, devices, and profile data for that account are gone. Sign-in and password-reset mail still comes from the authentication provider. If this was not you, write to ${LEGAL_OPERATOR.supportEmail}.`,
  },
} as const;

export type TransactionalTemplateId = keyof typeof TRANSACTIONAL_TEMPLATES;

const FORBIDDEN_VAR_KEYS =
  /^(messages|transcript|payload|content|text|token|secret|password|authorization)$/i;

export type TransactionalSendInput = {
  template: TransactionalTemplateId;
  to: string;
  vars?: Record<string, string>;
};

export type TransactionalSendResult =
  | { ok: true; skipped?: "not_configured" | "invalid_recipient" }
  | { ok: false; error: string };

type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function isAllowedTransactionalTemplate(
  value: string,
): value is TransactionalTemplateId {
  return value in TRANSACTIONAL_TEMPLATES;
}

export function assertSafeTransactionalVars(
  vars: Record<string, string> | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!vars) return { ok: true };
  for (const key of Object.keys(vars)) {
    if (FORBIDDEN_VAR_KEYS.test(key)) {
      return { ok: false, error: `Transactional email cannot include ${key}.` };
    }
  }
  return { ok: true };
}

export function buildTransactionalMessage(input: TransactionalSendInput): {
  subject: string;
  text: string;
} {
  const template = TRANSACTIONAL_TEMPLATES[input.template];
  return { subject: template.subject, text: template.text };
}

export function resolveTransactionalEmailConfig(env: EnvLike = process.env):
  | { ok: true; apiKey: string; from: string }
  | { ok: false; reason: "not_configured" } {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return { ok: false, reason: "not_configured" };
  return { ok: true, apiKey, from };
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.includes(" ");
}

export async function sendTransactionalEmail(
  input: TransactionalSendInput,
  deps: {
    env?: EnvLike;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<TransactionalSendResult> {
  if (!isAllowedTransactionalTemplate(input.template)) {
    return { ok: false, error: "Unknown transactional template." };
  }
  const safeVars = assertSafeTransactionalVars(input.vars);
  if (!safeVars.ok) return safeVars;

  const to = input.to.trim();
  if (!looksLikeEmail(to)) {
    return { ok: true, skipped: "invalid_recipient" };
  }

  const env = deps.env ?? process.env;
  const config = resolveTransactionalEmailConfig(env);
  if (!config.ok) return { ok: true, skipped: "not_configured" };

  const message = buildTransactionalMessage(input);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      subject: message.subject,
      text: message.text,
    }),
  });

  if (!response.ok) {
    return { ok: false, error: "Transactional email could not be sent." };
  }
  return { ok: true };
}
