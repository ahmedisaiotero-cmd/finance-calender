-- CreateTable
CREATE TABLE "AiProvider" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "supportedOrigins" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCaptureSource" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "external" BOOLEAN NOT NULL DEFAULT false,
    "connectionId" TEXT NOT NULL,
    "permissionState" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AiCaptureSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "providerConversationRef" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "title" TEXT,
    "origin" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "captureMethod" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "rawTextRef" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "providerMessageRef" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "redactedText" TEXT NOT NULL,
    "redactionStatus" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "visibility" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiActivityEvent" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "kind" TEXT NOT NULL,
    "actorKind" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "providerId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "affectedAreas" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "verification" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reversibility" TEXT NOT NULL,
    "permissionScope" TEXT NOT NULL,
    "permissionState" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "correlationId" TEXT,
    "relatedEventIds" JSONB,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiArtifact" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "activityEventId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "artifactRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibility" TEXT NOT NULL,

    CONSTRAINT "AiArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLink" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fromEventId" TEXT NOT NULL,
    "toEventId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "basis" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "AiLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProvider_slug_key" ON "AiProvider"("slug");

-- CreateIndex
CREATE INDEX "AiCaptureSource_ownerId_permissionState_idx" ON "AiCaptureSource"("ownerId", "permissionState");

-- CreateIndex
CREATE UNIQUE INDEX "AiCaptureSource_ownerId_providerId_kind_connectionId_key" ON "AiCaptureSource"("ownerId", "providerId", "kind", "connectionId");

-- CreateIndex
CREATE INDEX "AiConversation_ownerId_capturedAt_idx" ON "AiConversation"("ownerId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiConversation_ownerId_providerId_providerConversationRef_key" ON "AiConversation"("ownerId", "providerId", "providerConversationRef");

-- CreateIndex
CREATE UNIQUE INDEX "AiConversation_ownerId_providerId_idempotencyKey_key" ON "AiConversation"("ownerId", "providerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_sentAt_idx" ON "AiMessage"("conversationId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiMessage_conversationId_providerMessageRef_key" ON "AiMessage"("conversationId", "providerMessageRef");

-- CreateIndex
CREATE INDEX "AiActivityEvent_ownerId_timestamp_idx" ON "AiActivityEvent"("ownerId", "timestamp");

-- CreateIndex
CREATE INDEX "AiActivityEvent_conversationId_timestamp_idx" ON "AiActivityEvent"("conversationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AiActivityEvent_ownerId_providerId_correlationId_key" ON "AiActivityEvent"("ownerId", "providerId", "correlationId");

-- CreateIndex
CREATE INDEX "AiArtifact_ownerId_createdAt_idx" ON "AiArtifact"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "AiArtifact_conversationId_idx" ON "AiArtifact"("conversationId");

-- CreateIndex
CREATE INDEX "AiLink_ownerId_createdAt_idx" ON "AiLink"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiLink_ownerId_fromEventId_toEventId_relationship_key" ON "AiLink"("ownerId", "fromEventId", "toEventId", "relationship");

-- AddForeignKey
ALTER TABLE "AiCaptureSource" ADD CONSTRAINT "AiCaptureSource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCaptureSource" ADD CONSTRAINT "AiCaptureSource_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "AiCaptureSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiActivityEvent" ADD CONSTRAINT "AiActivityEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiActivityEvent" ADD CONSTRAINT "AiActivityEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiActivityEvent" ADD CONSTRAINT "AiActivityEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AiMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiActivityEvent" ADD CONSTRAINT "AiActivityEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiActivityEvent" ADD CONSTRAINT "AiActivityEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "AiCaptureSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_activityEventId_fkey" FOREIGN KEY ("activityEventId") REFERENCES "AiActivityEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLink" ADD CONSTRAINT "AiLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLink" ADD CONSTRAINT "AiLink_fromEventId_fkey" FOREIGN KEY ("fromEventId") REFERENCES "AiActivityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLink" ADD CONSTRAINT "AiLink_toEventId_fkey" FOREIGN KEY ("toEventId") REFERENCES "AiActivityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
