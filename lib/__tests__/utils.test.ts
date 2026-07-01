import { describe, it, expect } from "vitest";
import { formatAmount } from "@/lib/utils";

describe("formatAmount", () => {
  // formatAmount takes integer cents and converts to major units for display,
  // so every input below is cents (e.g. 4200 renders as "42").
  describe("small amounts (< 10,000 major units) use locale string with symbol", () => {
    it("formats zero", () => {
      expect(formatAmount(0)).toBe("0 $");
    });

    it("formats a plain integer amount", () => {
      expect(formatAmount(4200)).toBe("42 $");
    });

    it("uses thousands separators via toLocaleString", () => {
      // 9,999.00 (999_900 cents) is below the 10,000 abbreviation threshold.
      expect(formatAmount(999_900)).toBe("9,999 $");
    });

    it("renders sub-unit cents as major-unit decimals", () => {
      expect(formatAmount(1250)).toBe("12.5 $");
    });

    it("honours a custom currency symbol", () => {
      expect(formatAmount(10_000, "€")).toBe("100 €");
    });
  });

  describe("abbreviation thresholds (applied to major units)", () => {
    it("abbreviates to K at exactly 10,000", () => {
      expect(formatAmount(1_000_000)).toBe("10.0K $");
    });

    it("does NOT abbreviate just below 10,000", () => {
      expect(formatAmount(999_900)).toBe("9,999 $");
    });

    it("abbreviates K with one decimal", () => {
      expect(formatAmount(1_250_000)).toBe("12.5K $");
    });

    it("abbreviates to M at exactly 1,000,000", () => {
      expect(formatAmount(100_000_000)).toBe("1.0M $");
    });

    it("abbreviates to B at exactly 1,000,000,000", () => {
      expect(formatAmount(100_000_000_000)).toBe("1.0B $");
    });

    it("abbreviates to T at exactly 1,000,000,000,000", () => {
      expect(formatAmount(100_000_000_000_000)).toBe("1.0T $");
    });

    it("rounds to one decimal at each tier", () => {
      expect(formatAmount(123_400_000)).toBe("1.2M $");
      expect(formatAmount(125_000_000_000)).toBe("1.3B $");
    });
  });

  describe("integer cents: summing amounts is exact", () => {
    // The migration's payoff: money is integer cents, so sums are exact and
    // there is no IEEE-754 drift to hide behind rounded display. Re-pointed
    // from the old Float-storage tests that documented 0.1 + 0.2 !== 0.3.
    it("sums cents exactly — 10c + 20c is exactly 30c (not 0.30000000000000004)", () => {
      expect(10 + 20).toBe(30);
      expect(formatAmount(10 + 20)).toBe("0.3 $");
    });

    it("sums many cent amounts with no accumulated error — 1999c × 3 = 5997c", () => {
      const total = [1999, 1999, 1999].reduce((s, n) => s + n, 0);

      expect(total).toBe(5997);
      expect(formatAmount(total)).toBe("59.97 $");
    });
  });
});
