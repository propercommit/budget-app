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

test.describe("Category components", () => {
  test("ribbon", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
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
    await expect(page.getByText("No categories found")).toBeVisible();

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
