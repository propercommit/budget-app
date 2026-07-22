-- Rename-proof rule→series pointer: a spending rule remembers the card it
-- routes to, so renaming an import-born series no longer splits it on the
-- next import. Purely additive (nullable column, no backfill) — existing
-- rules self-heal: the commit route stamps seriesId on first post-merge use.

-- AlterTable
ALTER TABLE "CategorizationRule" ADD COLUMN     "seriesId" TEXT;

-- AddForeignKey
ALTER TABLE "CategorizationRule" ADD CONSTRAINT "CategorizationRule_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "BudgetSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
