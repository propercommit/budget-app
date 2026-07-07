import { prisma } from "@/lib/prisma";
import { sumEntries } from "@/lib/spending/math";

/**
 * Recalculates and persists a spending item's `spent` as the signed sum of
 * all its entries — debits add, credits subtract, via {@link applyEntry}.
 *
 * The result may legitimately be negative (e.g. a card holding only a refund
 * for a previous month's expense) and is persisted as-is; clamping is
 * presentation-only. Shared by every entry mutation route so the recompute
 * formula exists exactly once on the server.
 */
export async function updateSpentAmount(spendingItemId: string): Promise<void> {

  const allEntries = await prisma.spendingEntry.findMany({
    where: { spendingItemId },
    select: { amount: true, direction: true },
  });

  const newSpent = sumEntries(allEntries);

  await prisma.spendingItem.update({
    where: { id: spendingItemId },
    data: { spent: newSpent },
  });
}
