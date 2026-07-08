/*
  BudgetSeries refactor (D18–D24): series identity moves off SpendingItem.

  Destructive by design — applied via `prisma migrate reset` on an empty
  database (D20, no backfill). `SpendingItem` loses name/icon/categoryId/userId
  (moved to the new `BudgetSeries` parent) and startDate/endDate (their only
  structural role was month derivation, now obsolete: `month` is a direct
  identity + partition field).
*/

-- DropForeignKey
ALTER TABLE "SpendingItem" DROP CONSTRAINT "SpendingItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "SpendingItem" DROP CONSTRAINT "SpendingItem_categoryId_fkey";

-- DropIndex
DROP INDEX "SpendingItem_userId_name_month_key";

-- DropIndex
DROP INDEX "SpendingItem_userId_idx";

-- DropIndex
DROP INDEX "SpendingItem_userId_month_idx";

-- AlterTable
ALTER TABLE "SpendingItem" DROP COLUMN "name",
DROP COLUMN "icon",
DROP COLUMN "startDate",
DROP COLUMN "endDate",
DROP COLUMN "userId",
DROP COLUMN "categoryId",
ADD COLUMN     "seriesId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "BudgetSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "BudgetSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetSeries_userId_idx" ON "BudgetSeries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetSeries_userId_name_key" ON "BudgetSeries"("userId", "name");

-- CreateIndex
CREATE INDEX "SpendingItem_seriesId_month_idx" ON "SpendingItem"("seriesId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SpendingItem_seriesId_month_key" ON "SpendingItem"("seriesId", "month");

-- AddForeignKey
ALTER TABLE "BudgetSeries" ADD CONSTRAINT "BudgetSeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSeries" ADD CONSTRAINT "BudgetSeries_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendingItem" ADD CONSTRAINT "SpendingItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "BudgetSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
