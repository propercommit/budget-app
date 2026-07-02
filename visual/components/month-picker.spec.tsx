import { test, expect } from "@playwright/experimental-ct-react";
import { MonthPicker } from "@/components/month-picker";
import { Providers } from "../providers";

// MonthPicker reads `new Date()` to bound navigation; pin the clock so the
// forward-arrow disabled state (and thus the screenshot) is stable.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-06-15T12:00:00Z"));
});

const noop = () => {};

test("month picker on the current month", async ({ mount }) => {
  const component = await mount(
    <Providers>
      <div className="max-w-md p-4">
        <MonthPicker selectedMonth="2026-06" onMonthChange={noop} />
      </div>
    </Providers>,
  );

  await expect(component).toContainText("June 2026");

  await expect(component).toHaveScreenshot("month-picker.png");
});
