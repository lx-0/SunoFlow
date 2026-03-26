-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT,
ADD COLUMN "bannerUrl" TEXT,
ADD COLUMN "featuredSongId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
