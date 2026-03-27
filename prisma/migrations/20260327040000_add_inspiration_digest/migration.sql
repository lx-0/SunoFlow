-- CreateTable
CREATE TABLE "InspirationDigest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspirationDigest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InspirationDigest_userId_createdAt_idx" ON "InspirationDigest"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "InspirationDigest" ADD CONSTRAINT "InspirationDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
