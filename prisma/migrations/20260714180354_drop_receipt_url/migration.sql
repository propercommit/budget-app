/*
  Warnings:

  - You are about to drop the column `receiptUrl` on the `SpendingEntry` table. All the data in the column will be lost.

  Destructive by design: no existing data migrated per D27 (flush-then-migrate).
  CONTRACT step of the expand/contract pair — apply (prisma migrate deploy) only after
  the `main` deployment no longer selects `receiptUrl`. Do not run `prisma migrate dev`
  against the shared hosted DB while this migration is pending.
*/
-- AlterTable
ALTER TABLE "SpendingEntry" DROP COLUMN "receiptUrl";
