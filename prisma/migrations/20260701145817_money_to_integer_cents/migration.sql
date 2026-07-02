-- Money is now stored as integer minor units (cents), not floating-point major
-- units. Amounts are parsed straight to cents on input and only divided by 100
-- at the display edge, so summing and reconciling against a bank balance stays
-- exact. The Float -> Int switch drops sub-cent precision by design; disposable
-- test data was flushed for this change (no in-place conversion).

-- AlterTable
ALTER TABLE "SpendingItem" ALTER COLUMN "budgeted" SET DEFAULT 0,
ALTER COLUMN "budgeted" SET DATA TYPE INTEGER,
ALTER COLUMN "spent" SET DEFAULT 0,
ALTER COLUMN "spent" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "IncomeSource" ALTER COLUMN "amount" SET DEFAULT 0,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "SpendingEntry" ALTER COLUMN "amount" SET DEFAULT 0,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;
