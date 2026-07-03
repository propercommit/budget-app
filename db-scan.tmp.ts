import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.spendingItem.findMany({ select: { month: true, name: true, id: true, _count: { select: { spendingEntries: true } } } });
  const byMonth = new Map<string, { items: number; entries: number }>();
  for (const it of items) {
    const m = byMonth.get(it.month) ?? { items: 0, entries: 0 };
    m.items += 1; m.entries += it._count.spendingEntries;
    byMonth.set(it.month, m);
  }
  console.log("[db] months:", JSON.stringify([...byMonth.entries()].sort()));
  const withEntries = items.filter(i => i._count.spendingEntries >= 2).slice(0, 5);
  console.log("[db] items with 2+ entries:", JSON.stringify(withEntries.map(i => ({ month: i.month, name: i.name, entries: i._count.spendingEntries }))));
}

main().finally(() => prisma.$disconnect());
