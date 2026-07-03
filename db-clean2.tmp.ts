import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.findFirst({ where: { email: "demo@budgetapp.ch" } });

  if (demo === null) { console.log("[db] no demo user"); return; }

  const res = await prisma.spendingEntry.deleteMany({ where: { name: { startsWith: "Pager test" }, spendingItem: { userId: demo.id } } });
  console.log("[db] deleted test entries:", res.count);

  const remaining = await prisma.spendingEntry.count({ where: { spendingItem: { userId: demo.id, month: "2026-06" } } });
  console.log("[db] demo June entries remaining:", remaining);
}

main().finally(() => prisma.$disconnect());
