import { test, expect } from "../test";
import { MonthPicker } from "@/components/month-picker";
import { Providers } from "../providers";
import { noop } from "../fixtures";

// The shared test base pins the clock to FIXED_NOW, so MonthPicker's
// `new Date()`-driven forward-arrow state is stable.

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
