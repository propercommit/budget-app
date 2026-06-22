// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChartCalculations } from "@/components/hooks/use-chart-calculations";

const pts = (...vals: number[]) =>
  vals.map((value, i) => ({ monthLabel: `M${i}`, value }));

describe("useChartCalculations — guard cases", () => {
  it("returns null with fewer than 2 points", () => {
    const { result } = renderHook(() =>
      useChartCalculations({ data: pts(100), height: 200 })
    );
    expect(result.current).toBeNull();
  });

  it("returns null when every value is zero", () => {
    const { result } = renderHook(() =>
      useChartCalculations({ data: pts(0, 0, 0), height: 200 })
    );
    expect(result.current).toBeNull();
  });
});

describe("useChartCalculations — geometry", () => {
  it("maps the highest value to the top and lowest to the bottom of the plot area", () => {
    const height = 200;
    const padding = 40;
    const { result } = renderHook(() =>
      useChartCalculations({ data: pts(0, 100), height, padding, width: 600 })
    );

    const r = result.current!;
    expect(r.points).toHaveLength(2);
    // First x sits at the left padding, last x at width - padding.
    expect(r.points[0].x).toBeCloseTo(padding, 6);
    expect(r.points[1].x).toBeCloseTo(600 - padding, 6);
    // Max value (100) -> top edge (height - padding - plotHeight = padding).
    expect(r.points[1].y).toBeCloseTo(padding, 6);
    // Min value (0) -> bottom edge (height - padding).
    expect(r.points[0].y).toBeCloseTo(height - padding, 6);
  });

  it("builds an SVG line path that starts with M and a closed area path", () => {
    const { result } = renderHook(() =>
      useChartCalculations({ data: pts(10, 20, 30), height: 200 })
    );
    const r = result.current!;
    expect(r.linePath.startsWith("M ")).toBe(true);
    expect(r.linePath).toContain(" L ");
    expect(r.areaPath.endsWith("Z")).toBe(true);
  });

  it("exposes latest and previous values for trend comparison", () => {
    const { result } = renderHook(() =>
      useChartCalculations({ data: pts(10, 20, 35), height: 200 })
    );
    expect(result.current!.latestValue).toBe(35);
    expect(result.current!.previousValue).toBe(20);
  });

  it("normalizes per-point animation delays to the configured duration", () => {
    const duration = 1.5;
    const { result } = renderHook(() =>
      useChartCalculations({ data: pts(10, 20, 30), height: 200, lineAnimationDuration: duration })
    );
    const delays = result.current!.pointDelays;
    expect(delays[0]).toBe(0);
    // Delays are cumulative and end at the full duration.
    expect(delays[delays.length - 1]).toBeCloseTo(duration, 6);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });
});
