import { test, expect } from "../test";
import { TrendsCard } from "@/components/trends/trends-card";
import { Providers } from "../providers";
import { cardCategories, trendSeries, cents } from "../fixtures";

const spendingTrend = [
  { label: "Apr", value: cents(462.55) },
  { label: "May", value: cents(495.3) },
  { label: "Jun", value: cents(528.25) },
];

const incomeTrend = [
  { label: "Apr", value: cents(5000) },
  { label: "May", value: cents(5500) },
  { label: "Jun", value: cents(5520) },
];

const categoryTrend: Record<string, { label: string; value: number }[]> = {
  Groceries: trendSeries,
  "Dining out": [
    { label: "Apr", value: cents(150) },
    { label: "May", value: cents(165) },
    { label: "Jun", value: cents(190) },
  ],
};

/** Trends card: collapsed summary (spending/income/net-savings) and the expanded per-category view. */
test.describe("Trends card", () => {
  test("collapsed", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <TrendsCard
            spendingData={spendingTrend}
            incomeData={incomeTrend}
            categoryData={categoryTrend}
            categories={cardCategories}
          />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Trends");

    await expect(component).toHaveScreenshot("trends-card-collapsed.png");
  });

  test("expanded", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <TrendsCard
            spendingData={spendingTrend}
            incomeData={incomeTrend}
            categoryData={categoryTrend}
            categories={cardCategories}
          />
        </div>
      </Providers>,
    );

    await component.getByRole("button", { name: "Expand" }).click();

    await expect(component).toHaveScreenshot("trends-card-expanded.png");
  });
});
