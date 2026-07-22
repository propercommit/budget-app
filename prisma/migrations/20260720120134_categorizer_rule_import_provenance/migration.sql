-- CreateEnum
CREATE TYPE "RuleValueType" AS ENUM ('income', 'spending', 'exclude');

-- AlterTable
ALTER TABLE "IncomeSource" ADD COLUMN     "bankRef" TEXT,
ADD COLUMN     "importId" TEXT;

-- AlterTable
ALTER TABLE "SpendingEntry" ADD COLUMN     "bankRef" TEXT,
ADD COLUMN     "importId" TEXT;

-- CreateTable
CREATE TABLE "CategorizationRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "match" TEXT NOT NULL,
    "valueType" "RuleValueType" NOT NULL,
    "categoryId" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategorizationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" TEXT,
    "statementStart" TEXT,
    "statementEnd" TEXT,
    "totalCount" INTEGER NOT NULL,
    "importedCount" INTEGER NOT NULL,
    "excludedCount" INTEGER NOT NULL,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategorizationRule_userId_match_idx" ON "CategorizationRule"("userId", "match");

-- CreateIndex
CREATE UNIQUE INDEX "CategorizationRule_userId_match_valueType_categoryId_key" ON "CategorizationRule"("userId", "match", "valueType", "categoryId");

-- AddForeignKey
ALTER TABLE "IncomeSource" ADD CONSTRAINT "IncomeSource_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendingEntry" ADD CONSTRAINT "SpendingEntry_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorizationRule" ADD CONSTRAINT "CategorizationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorizationRule" ADD CONSTRAINT "CategorizationRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

