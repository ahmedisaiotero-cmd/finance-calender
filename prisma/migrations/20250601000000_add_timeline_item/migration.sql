-- CreateEnum
CREATE TYPE "TimelineItemStatus" AS ENUM ('PLANNED', 'COMPLETED', 'DUE');

-- CreateTable
CREATE TABLE "TimelineItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "TimelineItemStatus" NOT NULL DEFAULT 'PLANNED',
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimelineItem_workspaceId_date_idx" ON "TimelineItem"("workspaceId", "date");

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
