-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN "isSmartPlaylist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Playlist" ADD COLUMN "smartPlaylistType" TEXT;
ALTER TABLE "Playlist" ADD COLUMN "smartPlaylistMeta" JSONB;
ALTER TABLE "Playlist" ADD COLUMN "smartRefreshedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Playlist_userId_isSmartPlaylist_idx" ON "Playlist"("userId", "isSmartPlaylist");
