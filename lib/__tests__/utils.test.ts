import { describe, it, expect } from "vitest";
import { formatAmount } from "@/lib/utils";

describe("formatAmount", () => {
  // formatAmount takes integer cents and converts to major units for display,
  // so every input below is cents (e.g. 4200 renders as "42").
  describe("small amounts (< 10,000 major units) use locale string with symbol", () => {
    it("formats zero", () => {
      expect(formatAmount(0)).toBe("0\u00A0$");
    });

    it("formats a plain integer amount", () => {
      expect(formatAmount(4200)).toBe("42\u00A0$");
    });

    it("uses thousands separators via toLocaleString", () => {
      // 9,999.00 (999_900 cents) is below the 10,000 abbreviation threshold.
      expect(formatAmount(999_900)).toBe("9,999\u00A0$");
    });

    it("renders sub-unit cents as major-unit decimals", () => {
      expect(formatAmount(1250)).toBe("12.5\u00A0$");
    });

    it("honours a custom currency symbol", () => {
      expect(formatAmount(10_000, "€")).toBe("100\u00A0€");
    });

    it("never emits a breakable space — the amount and symbol stay on one line", () => {
      // U+00A0 joins the pair at every tier; a plain space would let a narrow
      // flex cell wrap "1,234" and "$" onto separate lines.
      for (const cents of [4200, 1_000_000, 100_000_000, 100_000_000_000, 100_000_000_000_000]) expect(formatAmount(cents)).not.toContain(" ");
    });
  });

  describe("abbreviation thresholds (applied to major units)", () => {
    it("abbreviates to K at exactly 10,000", () => {
      expect(formatAmount(1_000_000)).toBe("10.0K\u00A0$");
    });

    it("does NOT abbreviate just below 10,000", () => {
      expect(formatAmount(999_900)).toBe("9,999\u00A0$");
    });

    it("abbreviates K with one decimal", () => {
      expect(formatAmount(1_250_000)).toBe("12.5K\u00A0$");
    });

    it("abbreviates to M at exactly 1,000,000", () => {
      expect(formatAmount(100_000_000)).toBe("1.0M\u00A0$");
    });

    it("abbreviates to B at exactly 1,000,000,000", () => {
      expect(formatAmount(100_000_000_000)).toBe("1.0B\u00A0$");
    });

    it("abbreviates to T at exactly 1,000,000,000,000", () => {
      expect(formatAmount(100_000_000_000_000)).toBe("1.0T\u00A0$");
    });

    it("rounds to one decimal at each tier", () => {
      expect(formatAmount(123_400_000)).toBe("1.2M\u00A0$");
      expect(formatAmount(125_000_000_000)).toBe("1.3B\u00A0$");
    });
  });

  describe("integer cents: summing amounts is exact", () => {
    // The migration's payoff: money is integer cents, so sums are exact and
    // there is no IEEE-754 drift to hide behind rounded display. Re-pointed
    // from the old Float-storage tests that documented 0.1 + 0.2 !== 0.3.
    it("sums cents exactly — 10c + 20c is exactly 30c (not 0.30000000000000004)", () => {
      expect(10 + 20).toBe(30);
      expect(formatAmount(10 + 20)).toBe("0.3\u00A0$");
    });

    it("sums many cent amounts with no accumulated error — 1999c × 3 = 5997c", () => {
      const total = [1999, 1999, 1999].reduce((s, n) => s + n, 0);

      expect(total).toBe(5997);
      expect(formatAmount(total)).toBe("59.97\u00A0$");
    });
  });
});
