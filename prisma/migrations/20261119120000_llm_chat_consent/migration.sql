-- Optional in-app chat may call OpenAI only after this timestamp is set.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "llmChatConsentAt" TIMESTAMP(3);
