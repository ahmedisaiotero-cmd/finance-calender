-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthYear" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleSubject" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_appleSubject_key" ON "User"("appleSubject");
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legalPolicyVersion" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legalAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ageConfirmedAt" TIMESTAMP(3);

-- Clean orphan chat rows before adding the user FK.
DELETE FROM "SyncChatMessage" WHERE "userId" NOT IN (SELECT "id" FROM "User");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SyncChatMessage_userId_fkey'
  ) THEN
    ALTER TABLE "SyncChatMessage"
      ADD CONSTRAINT "SyncChatMessage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Capture sources can be deleted with their conversations/events.
ALTER TABLE "AiConversation" DROP CONSTRAINT IF EXISTS "AiConversation_sourceId_fkey";
ALTER TABLE "AiConversation"
  ADD CONSTRAINT "AiConversation_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "AiCaptureSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiActivityEvent" DROP CONSTRAINT IF EXISTS "AiActivityEvent_sourceId_fkey";
ALTER TABLE "AiActivityEvent"
  ADD CONSTRAINT "AiActivityEvent_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "AiCaptureSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
