-- CreateTable
CREATE TABLE "SyncProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncProfile_userId_key" ON "SyncProfile"("userId");

-- CreateIndex
CREATE INDEX "SyncChatMessage_userId_createdAt_idx" ON "SyncChatMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "SyncProfile" ADD CONSTRAINT "SyncProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
