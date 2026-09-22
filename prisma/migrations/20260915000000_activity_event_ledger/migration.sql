-- CreateTable
CREATE TABLE "ActivityEventRecord" (
    "id" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "verification" TEXT NOT NULL,
    "actorKind" TEXT NOT NULL,
    "actorId" TEXT,
    "sourceService" TEXT NOT NULL,
    "sourceConnectionId" TEXT,
    "sourceExternal" BOOLEAN NOT NULL DEFAULT false,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT,
    "priorEventId" TEXT,
    "sourceRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "ActivityEventRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityEventRecord_workspaceId_userId_idempotencyKey_key" ON "ActivityEventRecord"("workspaceId", "userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ActivityEventRecord_workspaceId_userId_recordedAt_id_idx" ON "ActivityEventRecord"("workspaceId", "userId", "recordedAt", "id");

-- CreateIndex
CREATE INDEX "ActivityEventRecord_workspaceId_occurredAt_idx" ON "ActivityEventRecord"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEventRecord_workspaceId_correlationId_idx" ON "ActivityEventRecord"("workspaceId", "correlationId");

-- AddForeignKey
ALTER TABLE "ActivityEventRecord" ADD CONSTRAINT "ActivityEventRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEventRecord" ADD CONSTRAINT "ActivityEventRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEventRecord" ADD CONSTRAINT "ActivityEventRecord_priorEventId_fkey" FOREIGN KEY ("priorEventId") REFERENCES "ActivityEventRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
