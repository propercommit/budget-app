-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('debit', 'credit');

-- AlterTable
ALTER TABLE "SpendingEntry" ADD COLUMN     "direction" "Direction" NOT NULL DEFAULT 'debit';
