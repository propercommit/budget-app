import { test, expect } from "../test";
import { SpendingCard } from "@/components/spending/spending-card";
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
const coopEntry = {
  id: "e2",
  name: "Coop",
  date: "2026-06-11",
  amount: cents(52.75),
  receipt: null,
  link: "https://example.com/receipt",
};

const cardEntries = [
  { id: "e1", name: "Migros", date: "2026-06-03", amount: cents(84.2), receipt: null, link: null },
  coopEntry,
  { id: "e3", name: "Farmers market", date: "2026-06-18", amount: cents(31.5), receipt: null, link: null },
];

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
});
