import { test, expect } from "../test";
import { CategoryRibbon } from "@/components/category/category-ribbon";
import { CategoryPopin } from "@/components/category/popins/category-popin";
import { ManageCategoriesPopin } from "@/components/category/popins/manage-categories-popin";
import { DeleteCategoryDialog } from "@/components/category/popins/delete-category-dialog";
import { CategoryChip } from "@/components/category-chip";
import { LegendChip } from "@/components/legend-chip";
import { Chip } from "@/components/Chip";
import { Providers } from "../providers";
import { categories, cardCategories, noop } from "../fixtures";

/** Fixed per-category entry totals; includes a singular ("1 entry") and a zero. */
const entryCounts: Record<string, number> = {
  "cat-groceries": 8,
  "cat-transport": 5,
  "cat-dining": 12,
  "cat-housing": 1,
  "cat-fun": 0,
};

const noopAsync = async () => {};

/** More categories than the desktop pill budget, to trigger the "+N" peek. */
const manyCardCategories = [
  ...cardCategories,
  { name: "Gifts", icon: "piggy-bank", color: "#FF3B30" },
  { name: "Utilities", icon: "lightbulb", color: "#FF9F0A" },
  { name: "Kids", icon: "zap", color: "#5E6B7B" },
];

/** Long labels in a narrow row: the ribbon must shed pills into "+N" rather than wrap. */
const longLabelCategories = [
  { name: "Subscriptions", icon: "credit-card", color: "#FF3B30" },
  { name: "Food & Dining", icon: "utensils", color: "#FF9F0A" },
  { name: "Housing", icon: "home", color: "#007AFF" },
  { name: "Transport", icon: "car", color: "#34C759" },
  { name: "Entertainment", icon: "film", color: "#AF52DE" },
  { name: "Gifts", icon: "piggy-bank", color: "#FF3B30" },
  { name: "Utilities", icon: "lightbulb", color: "#FF9F0A" },
  { name: "Health", icon: "heart-pulse", color: "#34C759" },
  { name: "Travel", icon: "plane", color: "#007AFF" },
];

test.describe("Category components", () => {
  test("ribbon", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="p-4">
          <CategoryRibbon
            categories={cardCategories}
            selectedCategory="Groceries"
            onSelect={noop}
            onAddCategory={noop}
            onManage={noop}
          />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Groceries");

    await expect(component).toHaveScreenshot("category-ribbon.png");
  });

  test("ribbon — many categories (+N pill)", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="p-4">
          <CategoryRibbon
            categories={manyCardCategories}
            selectedCategory="Groceries"
            onSelect={noop}
            onAddCategory={noop}
            onManage={noop}
          />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Groceries");

    await expect(component).toHaveScreenshot("category-ribbon-overflow.png");
  });

  test("ribbon — narrow row sheds pills into +N instead of wrapping", async ({ mount }, testInfo) => {
    testInfo.skip(testInfo.project.name === "mobile", "The fit-to-width row is a desktop-only layout");

    const component = await mount(
      <Providers>
        <div className="p-4" style={{ width: 700 }}>
          <CategoryRibbon
            categories={longLabelCategories}
            selectedCategory="Subscriptions"
            onSelect={noop}
            onAddCategory={noop}
            onManage={noop}
          />
        </div>
      </Providers>,
    );

    await expect(component.getByRole("button", { name: /^\+\d/ })).toBeVisible();

    await expect(component).toHaveScreenshot("category-ribbon-narrow.png");
  });

  test("ribbon — overflow peek open", async ({ mount, page }, testInfo) => {
    testInfo.skip(testInfo.project.name === "mobile", "The +N peek is a desktop-only affordance");

    await mount(
      <Providers>
        <div className="p-4" style={{ minHeight: 400 }}>
          <CategoryRibbon
            categories={manyCardCategories}
            selectedCategory="Groceries"
            onSelect={noop}
            onAddCategory={noop}
            onManage={noop}
          />
        </div>
      </Providers>,
    );

    await page.getByRole("button", { name: "+3" }).click();
    await expect(page.getByRole("button", { name: "Utilities" })).toBeVisible();

    await expect(page).toHaveScreenshot("category-ribbon-peek-open.png");
  });

  test("chips — selected and unselected", async ({ mount }) => {
    const component = await mount(
      <div className="flex gap-3 p-4">
        <CategoryChip icon="shopping-cart" label="Groceries" color="#34C759" selected={true} onClick={noop} />
        <CategoryChip icon="car" label="Transport" color="#007AFF" selected={false} onClick={noop} />
      </div>,
    );

    await expect(component).toHaveScreenshot("category-chips.png");
  });

  test("legend chip + plain chip", async ({ mount }) => {
    const component = await mount(
      <div className="flex flex-col gap-3 p-4">
        <LegendChip label="Groceries" percentage={38} color="#34C759" />
        <Chip textSize="sm" backgroundColor="#E9F9EE" textColor="#34C759" label="Active" />
      </div>,
    );

    await expect(component).toHaveScreenshot("legend-and-plain-chip.png");
  });

  test("popin — create mode", async ({ mount, page }) => {
    await mount(
      <Providers>
        <CategoryPopin isOpen={true} onClose={noop} onSave={noop} mode="create" />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("category-popin-create.png");
  });

  test("popin — edit mode", async ({ mount, page }) => {
    await mount(
      <Providers>
        <CategoryPopin
          isOpen={true}
          onClose={noop}
          onSave={noop}
          onDelete={noop}
          mode="edit"
          initialName="Groceries"
          initialIcon="shopping-cart"
          initialColor="#34C759"
        />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("category-popin-edit.png");
  });

  test("popin — create mode, scrolled (condensed header, footer revealed)", async ({ mount, page }) => {
    await mount(
      <Providers>
        <CategoryPopin isOpen={true} onClose={noop} onSave={noop} mode="create" />
      </Providers>,
    );

    await page.locator(".overflow-y-auto").evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(page.getByRole("button", { name: "Create Category" })).toBeInViewport();

    await expect(page).toHaveScreenshot("category-popin-create-scrolled.png");
  });

  test("popin — edit mode, scrolled (delete action in footer)", async ({ mount, page }) => {
    await mount(
      <Providers>
        <CategoryPopin
          isOpen={true}
          onClose={noop}
          onSave={noop}
          onDelete={noop}
          mode="edit"
          initialName="Groceries"
          initialIcon="shopping-cart"
          initialColor="#34C759"
        />
      </Providers>,
    );

    await page.locator(".overflow-y-auto").evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(page.getByRole("button", { name: "Delete Category" })).toBeInViewport();

    await expect(page).toHaveScreenshot("category-popin-edit-scrolled.png");
  });

  test("manage popin", async ({ mount, page }) => {
    await mount(
      <Providers>
        <ManageCategoriesPopin
          isOpen={true}
          onClose={noop}
          categories={categories}
          entryCounts={entryCounts}
          onEditCategory={noop}
          onDeleteCategory={noop}
          onCreateCategory={noop}
        />
      </Providers>,
    );

    await expect(page.getByText("Manage Categories")).toBeVisible();

    await expect(page).toHaveScreenshot("category-manage-popin.png");
  });

  test("manage popin — empty search state", async ({ mount, page }) => {
    await mount(
      <Providers>
        <ManageCategoriesPopin
          isOpen={true}
          onClose={noop}
          categories={categories}
          entryCounts={entryCounts}
          onEditCategory={noop}
          onDeleteCategory={noop}
          onCreateCategory={noop}
        />
      </Providers>,
    );

    await page.getByPlaceholder("Search categories").fill("zzz");
    await expect(page.getByText("Nothing matches “zzz”. Try a different search.")).toBeVisible();

    await expect(page).toHaveScreenshot("category-manage-popin-empty-search.png");
  });

  test("delete confirmation dialog", async ({ mount, page }) => {
    await mount(
      <Providers>
        <DeleteCategoryDialog
          category={categories[0]}
          onCancel={noop}
          onConfirm={noopAsync}
        />
      </Providers>,
    );

    await expect(page.getByText('Delete "Groceries"?')).toBeVisible();

    await expect(page).toHaveScreenshot("category-delete-dialog.png");
  });
});
