import { test, expect } from "../test";
import type { Page } from "@playwright/test";
import { BudgetOverviewCard } from "@/components/budget-overview/budget-overview";
import { Providers } from "../providers";
import { categories, cents, spendingData } from "../fixtures";

/**
 * Overflow guards for the Income / Spent / Remaining stat tiles: amounts just
 * under the 10K abbreviation cutoff render unabbreviated ("9,876.54 $"), which
 * once pushed the fixed three-across row past the viewport on narrow screens.
 * The tiles must wrap onto extra lines instead of overflowing.
 */

const WIDE_INCOME = cents(9876.54);

/** First item's `spent` inflated so total spent and remaining are wide too. */
const wideSpendingItems = spendingData["2026-06"].map((item, index) =>
  index === 0 ? { ...item, spent: cents(5432.1) } : item,
);

/**
 * Measures the stat-tile row (the parent of the tile holding the "Income"
 * label): horizontal overflow in px and how many distinct lines the tiles
 * occupy. Throws when the row is missing so tests fail with a reason.
 */
async function statsRowMetrics(page: Page) {
  return page.evaluate(() => {
    const label = Array.from(document.querySelectorAll("p")).find((p) => p.textContent === "Income");

    if (label === undefined) throw new Error('no "Income" stat label in the DOM');

    const row = label.parentElement?.parentElement;

    if (row === null || row === undefined) throw new Error("stat tile has no row parent");

    const tiles = Array.from(row.children);
    const tops = tiles.map((tile) => Math.round(tile.getBoundingClientRect().top));

    return {
      rowOverflowX: row.scrollWidth - row.clientWidth,
      lineCount: new Set(tops).size,
      tileCount: tiles.length,
    };
  });
}

test("collapsed tiles wrap instead of overflowing at 320px", async ({ mount, page }) => {
  const component = await mount(
    <Providers>
      <div style={{ width: 320 }}>
        <BudgetOverviewCard
          totalIncome={WIDE_INCOME}
          categories={categories}
          spendingItems={wideSpendingItems}
        />
      </div>
    </Providers>,
  );

  const metrics = await statsRowMetrics(page);

  expect(metrics.tileCount).toBe(3);

  expect(metrics.rowOverflowX).toBe(0);

  expect(metrics.lineCount).toBeGreaterThan(1);

  await expect(component).toHaveScreenshot("budget-overview-collapsed-wrapped.png");
});

test("expanded stats row wraps instead of overflowing at 320px", async ({ mount, page }) => {
  const component = await mount(
    <Providers>
      <div style={{ width: 320 }}>
        <BudgetOverviewCard
          totalIncome={WIDE_INCOME}
          categories={categories}
          spendingItems={wideSpendingItems}
        />
      </div>
    </Providers>,
  );

  await component.getByRole("button", { name: "Expand" }).click();

  const metrics = await statsRowMetrics(page);

  expect(metrics.tileCount).toBe(3);

  expect(metrics.rowOverflowX).toBe(0);

  expect(metrics.lineCount).toBeGreaterThan(1);
});
