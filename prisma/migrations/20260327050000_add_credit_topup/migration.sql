-- CreateTable
CREATE TABLE "CreditTopUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditTopUp_stripeSessionId_key" ON "CreditTopUp"("stripeSessionId");

-- CreateIndex
CREATE INDEX "CreditTopUp_userId_idx" ON "CreditTopUp"("userId");

-- CreateIndex
CREATE INDEX "CreditTopUp_userId_expiresAt_idx" ON "CreditTopUp"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "CreditTopUp_stripeSessionId_idx" ON "CreditTopUp"("stripeSessionId");

-- AddForeignKey
ALTER TABLE "CreditTopUp" ADD CONSTRAINT "CreditTopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
