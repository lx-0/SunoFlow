-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailGenerationComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailWeeklyHighlights" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "unsubscribeToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");
