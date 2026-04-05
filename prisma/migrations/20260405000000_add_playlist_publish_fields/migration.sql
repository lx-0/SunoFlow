-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "genre" TEXT,
ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Playlist_isPublished_publishedAt_idx" ON "Playlist"("isPublished", "publishedAt");
