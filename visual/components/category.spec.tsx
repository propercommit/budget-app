import { test, expect } from "@playwright/experimental-ct-react";
import { CategoryRibbon } from "@/components/category/category-ribbon";
import { CategoryPopin } from "@/components/category/popins/category-popin";
import { CategoryChip } from "@/components/category-chip";
import { LegendChip } from "@/components/legend-chip";
import { Chip } from "@/components/Chip";
import { Providers } from "../providers";
import { cardCategories } from "../fixtures";

const noop = () => {};

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
});
