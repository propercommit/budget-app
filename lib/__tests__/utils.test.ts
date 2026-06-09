import { describe, it, expect } from "vitest";
import { formatAmount } from "@/lib/utils";

describe("formatAmount", () => {
  describe("small amounts (< 10,000) use locale string with symbol", () => {
    it("formats zero", () => {
      expect(formatAmount(0)).toBe("0 $");
    });

    it("formats a plain integer", () => {
      expect(formatAmount(42)).toBe("42 $");
    });

    it("uses thousands separators via toLocaleString", () => {
      // 9,999 is below the 10,000 abbreviation threshold.
      expect(formatAmount(9999)).toBe("9,999 $");
    });

    it("passes decimals through toLocaleString (no forced rounding)", () => {
      // toLocaleString defaults to max 3 fraction digits.
      expect(formatAmount(12.5)).toBe("12.5 $");
    });

    it("honours a custom currency symbol", () => {
      expect(formatAmount(100, "€")).toBe("100 €");
    });
  });

  describe("abbreviation thresholds", () => {
    it("abbreviates to K at exactly 10,000", () => {
      expect(formatAmount(10_000)).toBe("10.0K $");
    });

    it("does NOT abbreviate just below 10,000", () => {
      expect(formatAmount(9_999)).toBe("9,999 $");
    });

    it("abbreviates K with one decimal", () => {
      expect(formatAmount(12_500)).toBe("12.5K $");
    });

    it("abbreviates to M at exactly 1,000,000", () => {
      expect(formatAmount(1_000_000)).toBe("1.0M $");
    });

    it("abbreviates to B at exactly 1,000,000,000", () => {
      expect(formatAmount(1_000_000_000)).toBe("1.0B $");
    });

    it("abbreviates to T at exactly 1,000,000,000,000", () => {
      expect(formatAmount(1_000_000_000_000)).toBe("1.0T $");
    });

    it("rounds to one decimal at each tier", () => {
      expect(formatAmount(1_234_000)).toBe("1.2M $");
      expect(formatAmount(1_250_000_000)).toBe("1.3B $");
    });
  });

  describe("Float storage: summing realistic decimal amounts", () => {
    // Money is stored as Float in Prisma; summing carries IEEE-754 error.
    // These assert the documented/observable behavior so a future switch to
    // integer-cents or Decimal would intentionally break this test.
    it("0.1 + 0.2 does not equal 0.3 exactly (raw float)", () => {
      const sum = 0.1 + 0.2;
      expect(sum).not.toBe(0.3);
      expect(sum).toBeCloseTo(0.3, 10);
    });

    it("a small float-error sum still formats cleanly under the K threshold", () => {
      // 0.1 + 0.2 === 0.30000000000000004 — toLocaleString caps at 3 fraction
      // digits so the noise does not leak into the formatted output.
      const sum = 0.1 + 0.2;
      expect(formatAmount(sum)).toBe("0.3 $");
    });

    it("summing many cents accumulates representable error but rounds in display", () => {
      // 19.99 * 3 entries — classic float drift.
      const total = [19.99, 19.99, 19.99].reduce((s, n) => s + n, 0);
      // 59.97 is not exactly representable; the raw value drifts.
      expect(total).toBeCloseTo(59.97, 8);
      expect(formatAmount(total)).toBe("59.97 $");
    });
  });
});
