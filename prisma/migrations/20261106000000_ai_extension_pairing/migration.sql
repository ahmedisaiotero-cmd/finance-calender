-- CreateTable
CREATE TABLE "AiExtensionDevice" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "permissionState" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AiExtensionDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPairingCode" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPairingCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiExtensionDevice_tokenHash_key" ON "AiExtensionDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "AiExtensionDevice_ownerId_permissionState_idx" ON "AiExtensionDevice"("ownerId", "permissionState");

-- CreateIndex
CREATE UNIQUE INDEX "AiExtensionDevice_ownerId_connectionId_key" ON "AiExtensionDevice"("ownerId", "connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiPairingCode_codeHash_key" ON "AiPairingCode"("codeHash");

-- CreateIndex
CREATE INDEX "AiPairingCode_ownerId_expiresAt_idx" ON "AiPairingCode"("ownerId", "expiresAt");

-- AddForeignKey
ALTER TABLE "AiExtensionDevice" ADD CONSTRAINT "AiExtensionDevice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPairingCode" ADD CONSTRAINT "AiPairingCode_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
