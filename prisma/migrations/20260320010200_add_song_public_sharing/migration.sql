-- AlterTable
ALTER TABLE "Song" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Song" ADD COLUMN "publicSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Song_publicSlug_key" ON "Song"("publicSlug");
