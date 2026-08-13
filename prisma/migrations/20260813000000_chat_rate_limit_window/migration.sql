-- CreateTable
CREATE TABLE "ChatRateLimitWindow" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRateLimitWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatRateLimitWindow_windowStart_idx" ON "ChatRateLimitWindow"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRateLimitWindow_subjectId_windowStart_key" ON "ChatRateLimitWindow"("subjectId", "windowStart");
