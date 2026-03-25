-- CreateEnum
CREATE TYPE "GenerationFeedbackRating" AS ENUM ('thumbs_up', 'thumbs_down');

-- CreateTable
CREATE TABLE "GenerationFeedback" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "GenerationFeedbackRating" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationFeedback_songId_idx" ON "GenerationFeedback"("songId");

-- CreateIndex
CREATE INDEX "GenerationFeedback_userId_idx" ON "GenerationFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationFeedback_songId_userId_key" ON "GenerationFeedback"("songId", "userId");

-- AddForeignKey
ALTER TABLE "GenerationFeedback" ADD CONSTRAINT "GenerationFeedback_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationFeedback" ADD CONSTRAINT "GenerationFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
