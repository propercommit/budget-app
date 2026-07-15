import { describe, it, expect } from "vitest";
import { getTrendStats } from "../trend-stats";

describe("getTrendStats", () => {
  it("zeroes out an empty series and reports no comparable change", () => {
    expect(getTrendStats([])).toEqual({ current: 0, previous: 0, change: null });
  });

  it("treats a single month as real data — its value with change: null", () => {
    expect(getTrendStats([{ label: "Jul", value: 4250 }])).toEqual({ current: 4250, previous: 0, change: null });
  });

  it("computes current, previous and percent change from the last two points", () => {
    const stats = getTrendStats([
      { label: "May", value: 1000 },
      { label: "Jun", value: 2000 },
      { label: "Jul", value: 2500 },
    ]);

    expect(stats).toEqual({ current: 2500, previous: 2000, change: 25 });
  });

  it("keeps change at 0 when the previous value is non-positive", () => {
    expect(getTrendStats([{ label: "Jun", value: 0 }, { label: "Jul", value: 500 }]).change).toBe(0);

    expect(getTrendStats([{ label: "Jun", value: -100 }, { label: "Jul", value: 500 }]).change).toBe(0);
  });
});
