-- AlterTable
ALTER TABLE "PromptTemplate" ADD COLUMN "category" TEXT,
ADD COLUMN "description" TEXT;

-- CreateIndex
CREATE INDEX "PromptTemplate_category_idx" ON "PromptTemplate"("category");
