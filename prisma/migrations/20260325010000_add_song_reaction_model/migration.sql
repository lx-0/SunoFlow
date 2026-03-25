-- CreateTable
CREATE TABLE "SongReaction" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "timestamp" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SongReaction_songId_idx" ON "SongReaction"("songId");

-- CreateIndex
CREATE INDEX "SongReaction_userId_idx" ON "SongReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SongReaction_songId_userId_emoji_timestamp_key" ON "SongReaction"("songId", "userId", "emoji", "timestamp");

-- AddForeignKey
ALTER TABLE "SongReaction" ADD CONSTRAINT "SongReaction_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongReaction" ADD CONSTRAINT "SongReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
