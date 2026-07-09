import { test, expect } from "../test";
import { BudgetOverviewCard } from "@/components/budget-overview/budget-overview";
import { Providers } from "../providers";
import { categories, spendingData, totalIncome, cents } from "../fixtures";

const spendingItems = spendingData["2026-06"];

/** First category pushed over budget: the red "+x" chip renders inline before the amounts. */
const overBudgetItems = spendingItems.map((item, index) =>
  index === 0 ? { ...item, spent: item.budgeted + 234 } : item,
);

/**
 * Real four-figure amounts, over budget. `formatAmount` only abbreviates at >=10K,
 * so amounts below that render in full ("5,234.5 CHF") — wider than the legend's
 * amount slot, and wide enough that the Category Budgets row must drop the
 * over-budget chip and spent/budget below the name. Regression for the reported
 * mobile CHF overflow (both the legend and the category-budget rows).
 */
const wideAmountItems = spendingItems.map((item, index) => ({
  ...item,
  spent: [cents(2018.69), cents(5234.5), cents(747.11), cents(120)][index] ?? item.spent,
}));

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

  test("expanded — wide amounts stay within a mobile-width card", async ({ mount }) => {
    const component = await mount(
      // CHF: the 3-letter symbol is wider than "$", so four-figure amounts
      // exceed the legend's amount slot at mobile width — the reported case.
      <Providers currency="CHF">
        <div className="max-w-md p-4">
          <BudgetOverviewCard
            totalIncome={totalIncome}
            categories={categories}
            spendingItems={wideAmountItems}
          />
        </div>
      </Providers>,
    );

    await component.getByRole("button", { name: "Expand" }).click();
    await expect(component).toContainText("2,018.69 CHF");

    await expect(component).toHaveScreenshot("budget-overview-expanded-wide-amounts.png");
  });

  test("empty — first run", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <BudgetOverviewCard totalIncome={0} categories={[]} spendingItems={[]} isEmpty />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Your monthly snapshot appears once you add income and spending.");

    await expect(component).toHaveScreenshot("budget-overview-empty.png");
  });
});
