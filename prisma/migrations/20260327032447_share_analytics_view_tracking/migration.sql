-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "source" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SongView" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SongView_songId_viewedAt_idx" ON "SongView"("songId", "viewedAt");

-- CreateIndex
CREATE INDEX "SongView_viewedAt_idx" ON "SongView"("viewedAt");

-- AddForeignKey
ALTER TABLE "SongView" ADD CONSTRAINT "SongView_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
