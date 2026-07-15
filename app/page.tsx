import { Dashboard } from "@/components/dashboard";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { SpendingItem } from "@/lib/types";
import { sumEntries } from "@/lib/spending/math";
import { redirect } from "next/navigation";

export const revalidate = 30;

export default async function Home() {
  
  
  const user = await getAuthenticatedUser();
  

  if (!user) redirect("/login");

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const cutoffMonth = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

  const spendingItems = await prisma.spendingItem.findMany({
      where: { series: { userId: user.id },
        month: { gte: cutoffMonth }
       },
      select: {
          id: true,
          budgeted: true,
          spent: true,
          month: true,
          note: true,
          seriesId: true,
          series: {
              select: {
                  name: true,
                  icon: true,
                  recurring: true,
                  categoryId: true,
                  category: {
                      select: {
                          id: true,
                          label: true,
                          icon: true,
                          color: true,
                      }
                  },
              }
          },
          spendingEntries: {
              select: {
                  id: true,
                  name: true,
                  amount: true,
                  direction: true,
                  date: true,
                  receiptPath: true,
                  link: true,
                  spendingItemId: true,
              }
          }
      },
      orderBy: { createdAt: "asc" },
  });
  

  const [categories, incomeSources, allIncomeSources, preWindowItems] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.incomeSource.findMany({
      where: { userId: user.id, month: currentMonth },
      orderBy: { createdAt: "asc" },
    }),
    // Cross-month income (drives trends) — same 12-month window as the items
    // load above, so a month with income but no spending items still charts.
    prisma.incomeSource.findMany({
      where: { userId: user.id, month: { gte: cutoffMonth } },
      orderBy: { createdAt: "asc" },
    }),
    // Entry counts for months older than the loaded window, so the Manage
    // Categories popin can report what a cascade delete would really destroy
    // (the items payload above is cut off at `cutoffMonth`).
    prisma.spendingItem.findMany({
      where: { series: { userId: user.id }, month: { lt: cutoffMonth } },
      select: {
        series: { select: { categoryId: true } },
        _count: { select: { spendingEntries: true } },
      },
    }),
  ]);

  const preWindowEntryCounts: Record<string, number> = {};

  for (const item of preWindowItems) preWindowEntryCounts[item.series.categoryId] = (preWindowEntryCounts[item.series.categoryId] ?? 0) + item._count.spendingEntries;
  

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
      name: item.series.name,
      icon: item.series.icon,
      seriesId: item.seriesId,
      recurring: item.series.recurring,
      budgeted: item.budgeted,
      spent: sumEntries(item.spendingEntries),
      month: item.month,
      note: item.note ?? null,
      categoryId: item.series.categoryId,
      category: {
        id: item.series.category.id,
        label: item.series.category.label,
        icon: item.series.category.icon,
        color: item.series.category.color,
      },
      entries: item.spendingEntries.map(e => ({
        id: e.id,
        name: e.name,
        amount: e.amount,
        direction: e.direction,
        date: e.date?.toISOString().split("T")[0] ?? "",
        receiptPath: e.receiptPath ?? null,
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
      preWindowEntryCounts={preWindowEntryCounts}
    />
  );
}