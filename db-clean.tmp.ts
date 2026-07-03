import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.findFirst({ where: { email: "demo@budgetapp.ch" } });

  if (demo === null) { console.log("[db] no demo user"); return; }

  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  // Only what my accidental May visit created: demo user, month 2026-05, last hour.
  const items = await prisma.spendingItem.deleteMany({ where: { userId: demo.id, month: "2026-05", createdAt: { gte: cutoff } } });
  console.log("[db] deleted May items:", items.count);

  const income = await prisma.incomeSource.findMany({ where: { userId: demo.id, month: "2026-05" } });
  console.log("[db] May income sources (id, createdAt):", JSON.stringify(income.map(i => ({ id: i.id, createdAt: i.createdAt }))));

  const incomeDel = await prisma.incomeSource.deleteMany({ where: { userId: demo.id, month: "2026-05", createdAt: { gte: cutoff } } });
  console.log("[db] deleted May income copies:", incomeDel.count);
}

main().finally(() => prisma.$disconnect());
