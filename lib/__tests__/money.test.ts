import { describe, it, expect } from "vitest";
import { decimalPartsToCents, parseAmountToCents, centsToAmount, parseMoneyInput } from "@/lib/money";

describe("decimalPartsToCents", () => {
  it("combines whole and fractional digit groups into exact cents", () => {
    expect(decimalPartsToCents(10, "")).toBe(1000);
    expect(decimalPartsToCents(10, "10")).toBe(1010);
    expect(decimalPartsToCents(1234, "56")).toBe(123456);
  });

  it("right-pads a single fractional digit", () => {
    expect(decimalPartsToCents(10, "1")).toBe(1010);
  });

  it("combines the classic float-trap fractions without losing a cent", () => {
    expect(decimalPartsToCents(0, "29")).toBe(29);
    expect(decimalPartsToCents(4, "10")).toBe(410);
    expect(decimalPartsToCents(8, "20")).toBe(820);
  });

  it("half-up rounds beyond two fractional digits, carrying into the whole part", () => {
    expect(decimalPartsToCents(10, "999")).toBe(1100);
    expect(decimalPartsToCents(0, "005")).toBe(1);
    expect(decimalPartsToCents(1, "004")).toBe(100);
  });
});

describe("parseAmountToCents", () => {
  it("parses whole and two-decimal amounts into exact integer cents", () => {
    expect(parseAmountToCents("10")).toBe(1000);
    expect(parseAmountToCents("10.10")).toBe(1010);
    expect(parseAmountToCents("1234.56")).toBe(123456);
  });

  it("right-pads a single fractional digit", () => {
    expect(parseAmountToCents("10.1")).toBe(1010);
    expect(parseAmountToCents("0.5")).toBe(50);
  });

  it("accepts a leading dot with no whole part", () => {
    expect(parseAmountToCents(".50")).toBe(50);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseAmountToCents("  19.99  ")).toBe(1999);
  });

  it("converts the classic float-trap values without losing a cent", () => {
    // parseFloat("0.29") * 100 === 28.999…; Math.floor would drop a cent.
    expect(parseAmountToCents("0.29")).toBe(29);
    expect(parseAmountToCents("4.10")).toBe(410);
    expect(parseAmountToCents("8.20")).toBe(820);
  });

  it("half-up rounds beyond two fractional digits, carrying into the whole part", () => {
    expect(parseAmountToCents("10.999")).toBe(1100);
    expect(parseAmountToCents("0.005")).toBe(1);
    expect(parseAmountToCents("1.004")).toBe(100);
  });

  it("always returns a safe integer", () => {
    const cents = parseAmountToCents("1234.56");
    expect(cents).not.toBeNull();
    expect(Number.isSafeInteger(cents as number)).toBe(true);
  });

  it("rejects non-positive amounts", () => {
    expect(parseAmountToCents("0")).toBeNull();
    expect(parseAmountToCents("0.00")).toBeNull();
    expect(parseAmountToCents("0.001")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents(".")).toBeNull();
    expect(parseAmountToCents("10.")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("10.5.5")).toBeNull();
    expect(parseAmountToCents("1e3")).toBeNull();
    expect(parseAmountToCents("1,234.56")).toBeNull();
  });

  it("rejects amounts beyond the safe cap", () => {
    expect(parseAmountToCents("100000000000000000")).toBeNull();
  });
});

describe("centsToAmount", () => {
  it("converts integer cents back to major units", () => {
    expect(centsToAmount(1010)).toBe(10.1);
    expect(centsToAmount(123456)).toBe(1234.56);
    expect(centsToAmount(29)).toBe(0.29);
  });
});

describe("parseMoneyInput", () => {
  it("returns a validated major-unit number for well-formed input", () => {
    expect(parseMoneyInput("10.10")).toBe(10.1);
    expect(parseMoneyInput("19.99")).toBe(19.99);
    expect(parseMoneyInput(".5")).toBe(0.5);
  });

  it("rounds sub-cent input to whole cents", () => {
    expect(parseMoneyInput("10.999")).toBe(11);
  });

  it("returns null for invalid or non-positive input, so it doubles as the validity check", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("0")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput("-1")).toBeNull();
  });
});
