import { test, expect } from "../test";
import { SpendingCard } from "@/components/spending/spending-card";
import type { SpendingEntry } from "@/components/spending/spending-card-expanded";
import { SpendingItemDetailPopin } from "@/components/spending/popins/spending-item-detail-popin";
import { SpendingItemEditPopin } from "@/components/spending/popins/spending-item-edit-popin";
import { EntryDetailPopin } from "@/components/spending/popins/spending-entry-detail-popin";
import { EntryEditPopin } from "@/components/spending/popins/spending-entry-edit-popin";
import { Providers } from "../providers";
import { cardCategories, noop, cents } from "../fixtures";

/**
 * Spending feature: the carousel card (collapsed + expanded) and every popin
 * (item detail/edit, entry detail/edit). Popins use `PopinWrapper`, a
 * `fixed inset-0` overlay, so they are captured against the viewport (`page`).
 *
 * The create-entry popin defaults its date to `new Date()`; the shared test
 * base pins the clock so that screenshot is stable.
 */

// Card-shaped entries (the card uses `receipt`, not the fixtures' `receiptUrl`).
const coopEntry: SpendingEntry = {
  id: "e2",
  name: "Coop",
  date: "2026-06-11",
  amount: cents(52.75),
  direction: "debit",
  receipt: null,
  link: "https://example.com/receipt",
};

const cardEntries: SpendingEntry[] = [
  { id: "e1", name: "Migros", date: "2026-06-03", amount: cents(84.2), direction: "debit", receipt: null, link: null },
  coopEntry,
  { id: "e3", name: "Farmers market", date: "2026-06-18", amount: cents(31.5), direction: "debit", receipt: null, link: null },
];

// A credit (refund) entry: editing it preloads the popin's Credit state —
// pill on Credit, green "+" sign preview on the amount prefix.
const refundEntry: SpendingEntry = {
  id: "e4",
  name: "Coop refund",
  date: "2026-06-12",
  amount: cents(15),
  direction: "credit",
  receipt: null,
  link: null,
};

const cardProps = {
  spendingName: "Groceries",
  spendingItemIcon: "shopping-cart",
  categoryName: "Groceries",
  spendingCategoryColor: "#34C759",
  budgetNumber: cents(600),
  startDate: "2026-06-01",
  note: "Weekly supermarket runs",
  entries: cardEntries,
  categories: cardCategories,
  onItemUpdate: noop,
  onItemDelete: noop,
  onEntryCreate: noop,
  onEntryUpdate: noop,
  onEntryDelete: noop,
  onCreateCategory: noop,
  onToggleExpand: noop,
};

test.describe("Spending card", () => {
  test("collapsed", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <SpendingCard {...cardProps} isExpanded={false} />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Groceries");

    await expect(component).toHaveScreenshot("spending-card-collapsed.png");
  });

  test("expanded with entries", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <SpendingCard {...cardProps} isExpanded={true} />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Migros");

    await expect(component).toHaveScreenshot("spending-card-expanded.png");
  });

  test("expanded with a credit entry in the list", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <SpendingCard {...cardProps} entries={[...cardEntries, refundEntry]} isExpanded={true} />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Coop refund");

    await expect(component).toHaveScreenshot("spending-card-expanded-credit.png");
  });

  // Net-credit month (only a refund): spent is negative, so the header must
  // read "+amount" in green instead of a bare negative number.
  test("collapsed with net-credit spent", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <SpendingCard {...cardProps} entries={[refundEntry]} isExpanded={false} />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Groceries");

    await expect(component).toHaveScreenshot("spending-card-collapsed-net-credit.png");
  });

  test("expanded with net-credit spent", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <SpendingCard {...cardProps} entries={[refundEntry]} isExpanded={true} />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Coop refund");

    await expect(component).toHaveScreenshot("spending-card-expanded-net-credit.png");
  });
});

test.describe("Spending popins", () => {
  test("item detail", async ({ mount, page }) => {
    await mount(
      <Providers>
        <SpendingItemDetailPopin
          isOpen={true}
          onClose={noop}
          onEdit={noop}
          spendingName="Groceries"
          spendingItemIcon="shopping-cart"
          categoryName="Groceries"
          spendingCategoryColor="#34C759"
          budgetNumber={cents(600)}
          totalSpent={cents(168.45)}
          entriesCount={3}
          startDate="2026-06-01"
          note="Weekly supermarket runs"
        />
      </Providers>,
    );

    await expect(page.getByText("Groceries").first()).toBeVisible();

    await expect(page).toHaveScreenshot("spending-item-detail.png");
  });

  test("item edit — create mode", async ({ mount, page }) => {
    await mount(
      <Providers>
        <SpendingItemEditPopin
          isOpen={true}
          onClose={noop}
          onSave={noop}
          mode="create"
          categories={cardCategories}
          initialStartDate="2026-06-01"
        />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("spending-item-edit-create.png");
  });

  test("item edit — edit mode", async ({ mount, page }) => {
    await mount(
      <Providers>
        <SpendingItemEditPopin
          isOpen={true}
          onClose={noop}
          onSave={noop}
          onDelete={noop}
          mode="edit"
          categories={cardCategories}
          initialName="Groceries"
          initialIcon="shopping-cart"
          initialCategory="Groceries"
          initialBudget={600}
          initialStartDate="2026-06-01"
          initialNote="Weekly supermarket runs"
        />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("spending-item-edit-edit.png");
  });

  test("entry detail", async ({ mount, page }) => {
    await mount(
      <Providers>
        <EntryDetailPopin
          isOpen={true}
          onClose={noop}
          onEdit={noop}
          entry={coopEntry}
          spendingName="Groceries"
          spendingItemIcon="shopping-cart"
          spendingCategoryColor="#34C759"
        />
      </Providers>,
    );

    await expect(page.getByText("Coop").first()).toBeVisible();

    await expect(page).toHaveScreenshot("spending-entry-detail.png");
  });

  test("entry detail — credit entry", async ({ mount, page }) => {
    await mount(
      <Providers>
        <EntryDetailPopin
          isOpen={true}
          onClose={noop}
          onEdit={noop}
          entry={refundEntry}
          spendingName="Groceries"
          spendingItemIcon="shopping-cart"
          spendingCategoryColor="#34C759"
        />
      </Providers>,
    );

    await expect(page.getByText("Coop refund").first()).toBeVisible();

    await expect(page).toHaveScreenshot("spending-entry-detail-credit.png");
  });

  test("entry edit — create mode", async ({ mount, page }) => {
    await mount(
      <Providers>
        <EntryEditPopin
          isOpen={true}
          onClose={noop}
          onSave={noop}
          mode="create"
          entry={null}
          spendingName="Groceries"
          spendingItemIcon="shopping-cart"
          spendingCategoryName="Groceries"
          spendingCategoryColor="#34C759"
        />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("spending-entry-edit-create.png");
  });

  test("entry edit — edit mode", async ({ mount, page }) => {
    await mount(
      <Providers>
        <EntryEditPopin
          isOpen={true}
          onClose={noop}
          onSave={noop}
          onDelete={noop}
          mode="edit"
          entry={coopEntry}
          spendingName="Groceries"
          spendingItemIcon="shopping-cart"
          spendingCategoryName="Groceries"
          spendingCategoryColor="#34C759"
        />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("spending-entry-edit-edit.png");
  });

  test("entry edit — edit mode with credit selected", async ({ mount, page }) => {
    await mount(
      <Providers>
        <EntryEditPopin
          isOpen={true}
          onClose={noop}
          onSave={noop}
          onDelete={noop}
          mode="edit"
          entry={refundEntry}
          spendingName="Groceries"
          spendingItemIcon="shopping-cart"
          spendingCategoryName="Groceries"
          spendingCategoryColor="#34C759"
        />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("spending-entry-edit-credit.png");
  });
});
