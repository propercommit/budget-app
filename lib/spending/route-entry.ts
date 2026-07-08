import type { Prisma, SpendingEntry } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updateSpentAmount } from "@/lib/spending/update-spent";
import { flattenSpendingItem, spendingItemInclude } from "@/lib/spending/flatten-item";

/**
 * Cross-month entry routing (D19), shared by the entries POST and PUT routes
 * so the transaction exists exactly once.
 *
 * In one transaction: find-or-create the target month's incarnation of the
 * source item's series (created at `budgeted: 0`, D23), write the entry onto
 * it via `writeEntry`, recompute the affected `spent` values through the
 * shared helper (never clamped, D11), and return both items flattened so the
 * client can sync its month buckets without a full reload.
 *
 * `recomputeSource` is the one POST/PUT difference: a created entry never
 * touched the addressed item, but a moved entry just left it.
 */
export async function routeEntryToMonth({
  sourceItem,
  targetMonth,
  writeEntry,
  recomputeSource,
}: {
  sourceItem: { id: string; seriesId: string };
  targetMonth: string;
  writeEntry: (tx: Prisma.TransactionClient, targetItemId: string) => Promise<SpendingEntry>;
  recomputeSource: boolean;
}) {
  return prisma.$transaction(async (tx) => {

    const target = await tx.spendingItem.upsert({
      where: { seriesId_month: { seriesId: sourceItem.seriesId, month: targetMonth } },
      update: {},
      create: { seriesId: sourceItem.seriesId, month: targetMonth, budgeted: 0 },
    });

    const entry = await writeEntry(tx, target.id);

    if (recomputeSource) await updateSpentAmount(sourceItem.id, tx);

    await updateSpentAmount(target.id, tx);

    const source = await tx.spendingItem.findUniqueOrThrow({
      where: { id: sourceItem.id },
      include: spendingItemInclude,
    });

    const targetFull = await tx.spendingItem.findUniqueOrThrow({
      where: { id: target.id },
      include: spendingItemInclude,
    });

    return {
      entry,
      sourceItem: flattenSpendingItem(source),
      targetItem: flattenSpendingItem(targetFull),
    };
  });
}
