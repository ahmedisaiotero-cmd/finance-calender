import { prisma } from "@/lib/prisma";

export const LLM_CHAT_CONSENT_ERROR =
  "In-app chat needs separate consent in Settings.";

export const LLM_CHAT_CONSENT_CODE = "llm_consent_required" as const;

export function hasLlmChatConsent(
  consentAt: Date | string | null | undefined,
): boolean {
  if (!consentAt) return false;
  const value = consentAt instanceof Date ? consentAt : new Date(consentAt);
  return !Number.isNaN(value.getTime());
}

export async function loadLlmChatConsent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { llmChatConsentAt: true },
  });
  return hasLlmChatConsent(user?.llmChatConsentAt);
}

export async function setLlmChatConsent(input: {
  userId: string;
  consented: boolean;
  at?: Date;
}): Promise<{ llmChatConsentAt: Date | null }> {
  const llmChatConsentAt = input.consented ? (input.at ?? new Date()) : null;
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: { llmChatConsentAt },
    select: { llmChatConsentAt: true },
  });
  return { llmChatConsentAt: user.llmChatConsentAt };
}
