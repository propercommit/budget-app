import { test, expect } from "../test";
import type { Page } from "@playwright/test";
import { SpendingCard } from "@/components/spending/spending-card";
import type { SpendingEntry } from "@/components/spending/spending-card-expanded";
import { Dashboard } from "@/components/dashboard";
import { Providers } from "../providers";
import {
  baseCardProps,
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
  ...baseCardProps,
  spendingName: LONG_NAME,
  spendingItemIcon: "credit-card",
  categoryName: "Fixed costs and other recurring payments",
  spendingCategoryColor: "#AF52DE",
  entries: longEntries,
};

/** First spending item of the selected month renamed to the long name. */
const longSpendingData = {
  ...spendingData,
  [SELECTED_MONTH]: spendingData[SELECTED_MONTH].map((item, index) => (index === 0 ? { ...item, name: LONG_NAME } : item)),
};

/** Measures the card that contains `name`; throws when card or button are missing so tests fail with a reason. */
async function cardMetrics(page: Page, name: string) {
  return page.evaluate((targetName) => {
    const title = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent === targetName);

    if (title === undefined) throw new Error(`no card title "${targetName}" in the DOM`);

    const card = title.closest("[data-spending-card]");

    if (card === null) throw new Error(`no [data-spending-card] ancestor around "${targetName}"`);

    const editButton = card.querySelector('button[aria-label="Edit spending item"]');

    if (editButton === null) throw new Error("edit button missing from the card");

    const cardRect = card.getBoundingClientRect();
    const buttonRect = editButton.getBoundingClientRect();

    return {
      cardOverflowX: card.scrollWidth - card.clientWidth,
      nameTruncated: title.scrollWidth > title.clientWidth,
      editInsideCard: buttonRect.right <= cardRect.right + 0.5 && buttonRect.left >= cardRect.left - 0.5,
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

  expect(metrics.cardOverflowX).toBe(0);

  expect(metrics.editInsideCard).toBe(true);

  expect(metrics.nameTruncated).toBe(true);
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

  expect(metrics.cardOverflowX).toBe(0);

  expect(metrics.editInsideCard).toBe(true);

  expect(metrics.nameTruncated).toBe(true);
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

  expect(metrics.cardOverflowX).toBe(0);

  expect(metrics.editInsideCard).toBe(true);
});
