import { test, expect } from "../test";
import { Dashboard } from "@/components/dashboard";
import { Providers } from "../providers";
import {
  categories,
  spendingData,
  incomeSources,
  allIncomeSources,
  SELECTED_MONTH,
} from "../fixtures";

/**
 * The main app screen (`app/page.tsx` is a thin server wrapper that hands these
 * exact props to `<Dashboard>`). Covers the populated dashboard and the
 * first-run empty state across mobile and desktop.
 */
test.describe("Dashboard screen", () => {
  test("populated with income, spending, trends and budget overview", async ({
    mount,
  }) => {
    const component = await mount(
      <Providers>
        <Dashboard
          initialCategories={categories}
          initialSpendingData={spendingData}
          initialIncomeSources={incomeSources}
          initialAllIncomeSources={allIncomeSources}
          initialMonth={SELECTED_MONTH}
        />
      </Providers>,
    );

    await expect(component).toContainText("Budget Planner");

    await expect(component).toHaveScreenshot("dashboard-populated.png");
  });

  test("empty first-run state with no data", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <Dashboard
          initialCategories={[]}
          initialSpendingData={{}}
          initialIncomeSources={[]}
          initialAllIncomeSources={[]}
          initialMonth={SELECTED_MONTH}
        />
      </Providers>,
    );

    await expect(component).toContainText("Budget Planner");

    await expect(component).toHaveScreenshot("dashboard-empty.png");
  });

  // Pins the transition the guided first-run flow promises: the first income
  // source removes the welcome banner and populates the income donut while
  // spending is still empty.
  test("first-run after the first income source", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <Dashboard
          initialCategories={[]}
          initialSpendingData={{}}
          initialIncomeSources={[incomeSources[0]]}
          initialAllIncomeSources={[incomeSources[0]]}
          initialMonth={SELECTED_MONTH}
        />
      </Providers>,
    );

    await expect(component).toContainText("Budget Planner");

    await expect(component).toHaveScreenshot("dashboard-first-income.png");
  });
});
