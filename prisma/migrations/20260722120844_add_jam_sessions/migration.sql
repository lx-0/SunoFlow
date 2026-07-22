-- CreateTable
CREATE TABLE "JamSession" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "budgetTotal" INTEGER NOT NULL DEFAULT 30,
    "budgetUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "JamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamSessionEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "songId" TEXT,
    "promptText" TEXT NOT NULL,
    "guestName" TEXT,
    "guestKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamSessionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JamSession_playlistId_key" ON "JamSession"("playlistId");

-- CreateIndex
CREATE UNIQUE INDEX "JamSession_shareToken_key" ON "JamSession"("shareToken");

-- CreateIndex
CREATE INDEX "JamSession_hostUserId_status_idx" ON "JamSession"("hostUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JamSessionEntry_songId_key" ON "JamSessionEntry"("songId");

-- CreateIndex
CREATE INDEX "JamSessionEntry_sessionId_createdAt_idx" ON "JamSessionEntry"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "JamSessionEntry_sessionId_guestKey_idx" ON "JamSessionEntry"("sessionId", "guestKey");

-- AddForeignKey
ALTER TABLE "JamSession" ADD CONSTRAINT "JamSession_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSession" ADD CONSTRAINT "JamSession_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionEntry" ADD CONSTRAINT "JamSessionEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionEntry" ADD CONSTRAINT "JamSessionEntry_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
