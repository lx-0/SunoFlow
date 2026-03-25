-- AddColumn: lyricsEdited to Song
ALTER TABLE "Song" ADD COLUMN "lyricsEdited" TEXT;

-- CreateTable: LyricTimestamp
CREATE TABLE "LyricTimestamp" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "lineIndex" INTEGER NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LyricTimestamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LyricAnnotation
CREATE TABLE "LyricAnnotation" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "lineIndex" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LyricAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LyricTimestamp_songId_lineIndex_key" ON "LyricTimestamp"("songId", "lineIndex");
CREATE INDEX "LyricTimestamp_songId_idx" ON "LyricTimestamp"("songId");

CREATE UNIQUE INDEX "LyricAnnotation_songId_lineIndex_key" ON "LyricAnnotation"("songId", "lineIndex");
CREATE INDEX "LyricAnnotation_songId_idx" ON "LyricAnnotation"("songId");

-- AddForeignKey
ALTER TABLE "LyricTimestamp" ADD CONSTRAINT "LyricTimestamp_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LyricAnnotation" ADD CONSTRAINT "LyricAnnotation_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
