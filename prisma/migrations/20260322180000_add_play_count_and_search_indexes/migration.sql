-- AlterTable
ALTER TABLE "Song" ADD COLUMN "playCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Song_userId_createdAt_idx" ON "Song"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Song_userId_playCount_idx" ON "Song"("userId", "playCount");
