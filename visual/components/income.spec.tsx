import { test, expect } from "../test";
import { IncomeCard } from "@/components/income/income-card";
import { IncomeDetailPopin } from "@/components/income/popins/income-detail-popin";
import { IncomePopin } from "@/components/income/popins/income-edit-popin";
import { Providers } from "../providers";
import { incomeSources, incomeSource, noop } from "../fixtures";

/** Income feature: the summary card (collapsed donut + expanded list) and popins. */
test.describe("Income card", () => {
  test("collapsed", async ({ mount }) => {
    const component = await mount(
      <Providers>
        {/* Wide enough for the desktop donut + figures cluster; the mobile
            project's 390px viewport still caps the mobile layout naturally. */}
        <div className="max-w-2xl p-4">
          <IncomeCard incomes={incomeSources} onAdd={noop} onSelect={noop} />
        </div>
      </Providers>,
    );

    await expect(component).toContainText("Income");

    await expect(component).toHaveScreenshot("income-card-collapsed.png");
  });

  test("expanded", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <IncomeCard incomes={incomeSources} onAdd={noop} onSelect={noop} />
        </div>
      </Providers>,
    );

    await component.getByRole("button", { name: "Expand" }).click();
    await expect(component).toContainText("Salary");

    await expect(component).toHaveScreenshot("income-card-expanded.png");
  });
});

test.describe("Income popins", () => {
  test("detail", async ({ mount, page }) => {
    await mount(
      <Providers>
        <IncomeDetailPopin isOpen={true} onClose={noop} onEdit={noop} income={incomeSource} />
      </Providers>,
    );

    await expect(page.getByText("Salary").first()).toBeVisible();

    await expect(page).toHaveScreenshot("income-detail.png");
  });

  test("edit — add mode", async ({ mount, page }) => {
    await mount(
      <Providers>
        <IncomePopin isOpen={true} onClose={noop} onSave={noop} mode="add" />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("income-edit-add.png");
  });

  test("edit — edit mode", async ({ mount, page }) => {
    await mount(
      <Providers>
        <IncomePopin
          isOpen={true}
          onClose={noop}
          onSave={noop}
          onDelete={noop}
          mode="edit"
          initialData={incomeSource}
        />
      </Providers>,
    );

    await expect(page).toHaveScreenshot("income-edit-edit.png");
  });
});
