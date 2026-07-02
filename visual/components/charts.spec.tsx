import { test, expect } from "../test";
import { DonutChart } from "@/components/ui/donut-chart";
import { AreaLineChart } from "@/components/area-line-chart";
import { CategoryTrendCard } from "@/components/trends/category-trend-card";
import { Sparkline } from "@/components/trends/sparkline";
import { MiniAreaChart } from "@/components/trends/mini-area-chart";
import { StatBox } from "@/components/trends/stat-box";
import { Providers } from "../providers";
import { noop, trendSeries as series } from "../fixtures";

/** Hand-rolled inline-SVG charts and the small trend widgets built on them. */
test.describe("Charts", () => {
  test("donut chart", async ({ mount }) => {
    const component = await mount(
      <div className="p-4">
        <DonutChart
          size={200}
          strokeWidth={24}
          segments={[
            { value: 5200, color: "#007AFF" },
            { value: 320, color: "#FF9F0A" },
          ]}
          trackColor="#F2F2F7"
          centerContent={<span className="text-lg font-bold">5,520 $</span>}
        />
      </div>,
    );

    await expect(component).toHaveScreenshot("donut-chart.png");
  });

  test("area line chart", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-md p-4">
          <AreaLineChart
            data={series.map((d) => ({ monthLabel: d.label, value: d.value }))}
            color="#34C759"
            graphId="area-chart-fixture"
          />
        </div>
      </Providers>,
    );

    await expect(component).toHaveScreenshot("area-line-chart.png");
  });

  test("category trend card", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-xs p-4">
          <CategoryTrendCard
            category={{ name: "Groceries", icon: "shopping-cart", color: "#34C759" }}
            data={series}
            isSelected={false}
            onClick={noop}
          />
        </div>
      </Providers>,
    );

    await expect(component).toHaveScreenshot("category-trend-card.png");
  });

  test("sparkline", async ({ mount }) => {
    const component = await mount(
      <div className="p-4">
        <Sparkline data={series} color="#FF3B30" />
      </div>,
    );

    await expect(component).toHaveScreenshot("sparkline.png");
  });

  test("mini area chart", async ({ mount }) => {
    const component = await mount(
      <div className="max-w-xs p-4">
        <MiniAreaChart data={series} color="#007AFF" />
      </div>,
    );

    await expect(component).toHaveScreenshot("mini-area-chart.png");
  });

  test("stat box", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <div className="max-w-xs p-4">
          <StatBox
            label="Spending"
            value={528.25}
            change={8.2}
            color="#FF3B30"
            bgColor="#FFF1F0"
            sparklineData={series}
          />
        </div>
      </Providers>,
    );

    await expect(component).toHaveScreenshot("stat-box.png");
  });
});
