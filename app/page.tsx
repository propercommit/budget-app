import { Dashboard } from "@/components/dashboard";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { SpendingItem } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [categories, spendingItems, incomeSources, allIncomeSources] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.spendingItem.findMany({
      where: { userId: user.id },
      include: { category: true, spendingEntries: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.incomeSource.findMany({
      where: { userId: user.id, month: currentMonth },
      orderBy: { createdAt: "asc" },
    }),
    prisma.incomeSource.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const mappedCategories = categories.map(c => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    color: c.color,
  }));

  const spendingData: Record<string, SpendingItem[]> = {};
  for (const item of spendingItems) {
    if (!spendingData[item.month]) spendingData[item.month] = [];
    spendingData[item.month].push({
      id: item.id,
      name: item.name,
      icon: item.icon,
      budgeted: item.budgeted,
      spent: item.spendingEntries.reduce((sum, e) => sum + e.amount, 0),
      month: item.month,
      startDate: item.startDate?.toISOString().split("T")[0] ?? `${item.month}-01`,
      endDate: item.endDate?.toISOString().split("T")[0] ?? null,
      note: item.note ?? null,
      categoryId: item.categoryId,
      category: item.category ? {
        id: item.category.id,
        label: item.category.label,
        icon: item.category.icon,
        color: item.category.color,
      } : undefined,
      entries: item.spendingEntries.map(e => ({
        id: e.id,
        name: e.name,
        amount: e.amount,
        date: e.date?.toISOString().split("T")[0] ?? "",
        receiptUrl: e.receiptUrl ?? null,
        link: e.link ?? null,
        spendingItemId: e.spendingItemId,
      })),
    });
  }

  const mapIncome = (sources: typeof incomeSources) => sources.map(i => ({
    id: i.id,
    name: i.name,
    amount: i.amount,
    icon: i.icon,
    type: i.type as "active" | "passive",
    startDate: i.startDate,
    endDate: i.endDate ?? undefined,
    note: i.note ?? undefined,
    month: i.month,
  }));

  return (
    <Dashboard
      initialCategories={mappedCategories}
      initialSpendingData={spendingData}
      initialIncomeSources={mapIncome(incomeSources)}
      initialAllIncomeSources={mapIncome(allIncomeSources)}
      initialMonth={currentMonth}
    />
  );
}