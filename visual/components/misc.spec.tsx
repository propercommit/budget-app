import { test, expect } from "../test";
import { Logo } from "@/components/logo";
import { SectionCard } from "@/components/section-card";
import { IconPicker } from "@/components/icon-picker";
import { ColorPicker } from "@/components/color-picker";
import { noop } from "../fixtures";

// Note: StickyBudgetBar is intentionally not tested in isolation — it self-hides
// (`return null`) until a scroll listener finds the Dashboard's
// `[data-spending-section]`/`[data-budget-overview]` nodes, so it only renders in
// the full-page context, not when mounted alone.

test.describe("Misc components", () => {
  test("logo sizes", async ({ mount }) => {
    const component = await mount(
      <div className="flex items-end gap-6 p-6">
        <Logo size="sm" animated={false} />
        <Logo size="md" animated={false} />
        <Logo size="lg" animated={false} />
      </div>,
    );

    await expect(component).toHaveScreenshot("logo-sizes.png");
  });

  test("section card", async ({ mount }) => {
    const component = await mount(
      <div className="max-w-md p-4">
        <SectionCard>
          <p className="text-sm font-semibold">Section title</p>
          <p className="text-xs text-gray-500">Some card content lives here.</p>
        </SectionCard>
      </div>,
    );

    await expect(component).toHaveScreenshot("section-card.png");
  });

  test("icon picker", async ({ mount }) => {
    const component = await mount(
      <div className="max-w-md p-4">
        <IconPicker value="shopping-cart" onChange={noop} />
      </div>,
    );

    await expect(component).toHaveScreenshot("icon-picker.png");
  });

  test("color picker", async ({ mount }) => {
    const component = await mount(
      <div className="max-w-md p-4">
        <ColorPicker value="#34C759" onChange={noop} />
      </div>,
    );

    await expect(component).toHaveScreenshot("color-picker.png");
  });
});
