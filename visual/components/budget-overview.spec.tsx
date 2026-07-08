import { test, expect } from "../test";
import { BudgetOverviewCard } from "@/components/budget-overview/budget-overview";
import { Providers } from "../providers";
import { categories, spendingData, totalIncome } from "../fixtures";

const spendingItems = spendingData["2026-06"];

/** First category pushed over budget: the red "+x" chip renders inline before the amounts. */
const overBudgetItems = spendingItems.map((item, index) =>
  index === 0 ? { ...item, spent: item.budgeted + 234 } : item,
);

/** Budget overview: the collapsed income/spent/remaining summary and the expanded per-category breakdown. */
test.describe("Budget overview", () => {
  test("collapsed", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <BudgetOverviewCard
            totalIncome={totalIncome}
            categories={categories}
            spendingItems={spendingItems}
          />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Budget Overview");

    await expect(component).toHaveScreenshot("budget-overview-collapsed.png");
  });

  test("expanded", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="w-full max-w-3xl p-4">
          <BudgetOverviewCard
            totalIncome={totalIncome}
            categories={categories}
            spendingItems={spendingItems}
          />
        </div>
      </Providers>,
    );

    await component.getByRole("button", { name: "Expand" }).click();

    await expect(component).toHaveScreenshot("budget-overview-expanded.png");
  });

  test("expanded — over-budget chip inline before the amounts", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="w-full max-w-3xl p-4">
          <BudgetOverviewCard
            totalIncome={totalIncome}
            categories={categories}
            spendingItems={overBudgetItems}
          />
        </div>
      </Providers>,
    );

    await component.getByRole("button", { name: "Expand" }).click();
    await expect(component).toContainText("+2.34 $");

    await expect(component).toHaveScreenshot("budget-overview-expanded-over.png");
  });
});
