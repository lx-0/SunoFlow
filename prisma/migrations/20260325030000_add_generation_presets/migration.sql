-- CreateTable
CREATE TABLE "GenerationPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "stylePrompt" TEXT,
    "lyricsPrompt" TEXT,
    "isInstrumental" BOOLEAN NOT NULL DEFAULT false,
    "customMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationPreset_userId_idx" ON "GenerationPreset"("userId");

-- CreateIndex
CREATE INDEX "GenerationPreset_userId_createdAt_idx" ON "GenerationPreset"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "GenerationPreset" ADD CONSTRAINT "GenerationPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
