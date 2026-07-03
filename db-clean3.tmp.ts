import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.findFirst({ where: { email: "demo@budgetapp.ch" } });

  if (demo === null) return;

  const res = await prisma.spendingItem.updateMany({ where: { userId: demo.id, month: "2026-06", name: "Restaurants & Takeout" }, data: { spent: 0 } });
  console.log("[db] reset stale spent on:", res.count, "item(s)");
}

main().finally(() => prisma.$disconnect());
