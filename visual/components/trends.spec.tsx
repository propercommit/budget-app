import { test, expect } from "@playwright/experimental-ct-react";
import { TrendsCard } from "@/components/trends/trends-card";
import { Providers } from "../providers";
import { cardCategories } from "../fixtures";

const spendingTrend = [
  { label: "Apr", value: 462.55 },
  { label: "May", value: 495.3 },
  { label: "Jun", value: 528.25 },
];

const incomeTrend = [
  { label: "Apr", value: 5000 },
  { label: "May", value: 5500 },
  { label: "Jun", value: 5520 },
];

const categoryTrend: Record<string, { label: string; value: number }[]> = {
  Groceries: [
    { label: "Apr", value: 168 },
    { label: "May", value: 175 },
    { label: "Jun", value: 208 },
  ],
  "Dining out": [
    { label: "Apr", value: 150 },
    { label: "May", value: 165 },
    { label: "Jun", value: 190 },
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
