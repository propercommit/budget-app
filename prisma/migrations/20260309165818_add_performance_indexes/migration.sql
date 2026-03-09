-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "IncomeSource_userId_idx" ON "IncomeSource"("userId");

-- CreateIndex
CREATE INDEX "IncomeSource_userId_month_idx" ON "IncomeSource"("userId", "month");

-- CreateIndex
CREATE INDEX "SpendingEntry_spendingItemId_idx" ON "SpendingEntry"("spendingItemId");

-- CreateIndex
CREATE INDEX "SpendingItem_userId_idx" ON "SpendingItem"("userId");

-- CreateIndex
CREATE INDEX "SpendingItem_userId_month_idx" ON "SpendingItem"("userId", "month");
