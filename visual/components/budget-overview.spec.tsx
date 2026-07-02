import { test, expect } from "@playwright/experimental-ct-react";
import { BudgetOverviewCard } from "@/components/budget-overview/budget-overview";
import { Providers } from "../providers";
import { categories, spendingData } from "../fixtures";

const spendingItems = spendingData["2026-06"];
const totalIncome = 5520;

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
        <div className="max-w-md p-4">
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
});
