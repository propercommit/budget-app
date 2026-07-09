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

  // Sub-variant B of the guided step 2: once categories exist, the ribbon
  // renders above the still-empty spending body.
  test("empty month with existing categories keeps the ribbon above step 2", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <Dashboard
          initialCategories={categories}
          initialSpendingData={{}}
          initialIncomeSources={[]}
          initialAllIncomeSources={[]}
          initialMonth={SELECTED_MONTH}
        />
      </Providers>,
    );

    await expect(component).toContainText("STEP 2 OF 2");

    await expect(component).toHaveScreenshot("dashboard-empty-with-categories.png");
  });

  // Starter-chip reuse path: an existing category (any case) is reused —
  // never restyled — and the spending popin opens with the user's own label
  // preselected. The create path needs the API, so it lives in the jsdom
  // suite (dashboard-starter-chips.test.tsx).
  test("starter chip reuses an existing category and preselects it", async ({ mount, page }) => {
    const housing = { id: "cat-housing-lower", icon: "home", label: "housing", color: "#FF3B30" };

    const component = await mount(
      <Providers>
        <Dashboard
          initialCategories={[housing]}
          initialSpendingData={{}}
          initialIncomeSources={[]}
          initialAllIncomeSources={[]}
          initialMonth={SELECTED_MONTH}
        />
      </Providers>,
    );

    await component.getByRole("button", { name: "Housing", exact: true }).click();
    await expect(page.getByText("New Spending Item")).toBeVisible();
    await expect(page.getByRole("radio", { name: "housing" })).toHaveAttribute("aria-checked", "true");

    // The app header settles asynchronously behind the dimmed backdrop (the
    // account fetch swaps the button's spinner, the logo draws in on a
    // timer) — mask it; the subject here is the popin, and the header has
    // its own stable screenshots elsewhere.
    await expect(page).toHaveScreenshot("dashboard-starter-chip-popin.png", {
      mask: [
        component.getByRole("button", { name: "Go to account settings" }),
        component.locator("svg").first(),
      ],
    });
  });
});
