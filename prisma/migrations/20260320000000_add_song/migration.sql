-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sunoJobId" TEXT,
    "title" TEXT,
    "prompt" TEXT,
    "tags" TEXT,
    "audioUrl" TEXT,
    "imageUrl" TEXT,
    "duration" DOUBLE PRECISION,
    "lyrics" TEXT,
    "sunoModel" TEXT,
    "generationStatus" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "pollCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Song_sunoJobId_key" ON "Song"("sunoJobId");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
