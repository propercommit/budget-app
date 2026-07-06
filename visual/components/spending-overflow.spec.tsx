import { test, expect } from "../test";
import { SpendingCard } from "@/components/spending/spending-card";
import type { SpendingEntry } from "@/components/spending/spending-card-expanded";
import { Dashboard } from "@/components/dashboard";
import { Providers } from "../providers";
import {
  cardCategories,
  noop,
  cents,
  categories,
  spendingData,
  incomeSources,
  allIncomeSources,
  SELECTED_MONTH,
} from "../fixtures";

/**
 * Assertion-only overflow guards (no screenshots): a long item name must
 * ellipsize instead of pushing the header actions out of the card. The
 * regression this pins down: the header once overflowed at the carousel's
 * real width (~308px on a 390px viewport) because the title lacked
 * `min-w-0`/`truncate` and the actions column could shrink.
 */

const LONG_NAME = "Subscriptions & Memberships International";

const longEntries: SpendingEntry[] = [
  { id: "e1", name: "Annual renewal — international premium family plan", date: "2026-06-03", amount: cents(84.2), direction: "debit", receipt: null, link: null },
];

const longCardProps = {
  spendingName: LONG_NAME,
  spendingItemIcon: "credit-card",
  categoryName: "Fixed costs and other recurring payments",
  spendingCategoryColor: "#AF52DE",
  budgetNumber: cents(600),
  startDate: "2026-06-01",
  entries: longEntries,
  categories: cardCategories,
  onItemUpdate: noop,
  onItemDelete: noop,
  onEntryCreate: noop,
  onEntryUpdate: noop,
  onEntryDelete: noop,
  onCreateCategory: noop,
  onToggleExpand: noop,
};

/** First spending item of the selected month renamed to the long name. */
const longSpendingData = {
  ...spendingData,
  [SELECTED_MONTH]: spendingData[SELECTED_MONTH].map((item, index) => (index === 0 ? { ...item, name: LONG_NAME } : item)),
};

/** Measures the card that contains `name`; null when it isn't in the DOM. */
async function cardMetrics(page: import("@playwright/test").Page, name: string) {
  return page.evaluate((targetName) => {
    const title = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent === targetName);

    if (title === undefined) return null;

    const card = title.closest(".bg-card");

    if (card === null) return null;

    const cardRect = card.getBoundingClientRect();
    const editButton = card.querySelector('button[aria-label="Edit spending item"]');
    const buttonRect = editButton === null ? null : editButton.getBoundingClientRect();

    return {
      cardOverflowX: card.scrollWidth - card.clientWidth,
      nameTruncated: title.scrollWidth > title.clientWidth,
      editInsideCard: buttonRect === null ? false : buttonRect.right <= cardRect.right + 0.5 && buttonRect.left >= cardRect.left - 0.5,
    };
  }, name);
}

test("collapsed card contains a long name at carousel width (308px)", async ({ mount, page }) => {
  await mount(
    <Providers>
      <div style={{ width: 308 }}>
        <SpendingCard {...longCardProps} isExpanded={false} />
      </div>
    </Providers>,
  );

  const metrics = await cardMetrics(page, LONG_NAME);

  expect(metrics).not.toBeNull();

  expect(metrics?.cardOverflowX).toBe(0);

  expect(metrics?.editInsideCard).toBe(true);

  expect(metrics?.nameTruncated).toBe(true);
});

test("expanded card contains long item and entry names at carousel width (308px)", async ({ mount, page }) => {
  await mount(
    <Providers>
      <div style={{ width: 308 }}>
        <SpendingCard {...longCardProps} isExpanded={true} />
      </div>
    </Providers>,
  );

  const metrics = await cardMetrics(page, LONG_NAME);

  expect(metrics).not.toBeNull();

  expect(metrics?.cardOverflowX).toBe(0);

  expect(metrics?.editInsideCard).toBe(true);

  expect(metrics?.nameTruncated).toBe(true);
});

test("collapsed card inside the dashboard keeps its edit button in bounds", async ({ mount, page }) => {
  await mount(
    <Providers>
      <Dashboard
        initialCategories={categories}
        initialSpendingData={longSpendingData}
        initialIncomeSources={incomeSources}
        initialAllIncomeSources={allIncomeSources}
        initialMonth={SELECTED_MONTH}
      />
    </Providers>,
  );

  const metrics = await cardMetrics(page, LONG_NAME);

  expect(metrics).not.toBeNull();

  expect(metrics?.cardOverflowX).toBe(0);

  expect(metrics?.editInsideCard).toBe(true);
});
