import { describe, it, expect } from "vitest";
import {
  Mt940Parser,
  Mt940ParseError,
  mt940Parser,
} from "@/lib/import/mt940-parser";

// --- helpers --------------------------------------------------------------

/** Joins MT940 lines with CRLF, the line ending SWIFT files use in the wild. */
const mt940 = (...lines: string[]): string => lines.join("\r\n");

const parser = new Mt940Parser();

// A minimal, well-formed single-statement document with two transactions:
// a debit with unstructured :86: and a credit with no :86:.
const SIMPLE_STATEMENT = mt940(
  ":20:STMT-REF-001",
  ":25:CH1234567890",
  ":28C:00001/001",
  ":60F:C260601CHF1000,00",
  ":61:2606020602D54,30NTRFNONREF//BANKREF001",
  ":86:MIGROS SUPERMARKT ZUERICH",
  ":61:2606030603C2500,00NTRFSALARY//BANKREF002",
  ":62F:C260603CHF3445,70",
  "-",
);

// --- basic shape ----------------------------------------------------------

describe("Mt940Parser.parse", () => {
  it("parses each :61: line into one transaction", () => {
    const txns = parser.parse(SIMPLE_STATEMENT);
    expect(txns).toHaveLength(2);
  });

  it("maps a debit line with unstructured :86: details", () => {
    const [debit] = parser.parse(SIMPLE_STATEMENT);
    expect(debit).toEqual({
      date: "2026-06-02",
      amount: 54.3,
      direction: "debit",
      description: "MIGROS SUPERMARKT ZUERICH",
      externalId: "BANKREF001",
      currency: "CHF",
    });
  });

  it("maps a credit line with no :86: and no reference, falling back to an empty description", () => {
    const [, credit] = parser.parse(SIMPLE_STATEMENT);
    expect(credit.direction).toBe("credit");
    expect(credit.amount).toBe(2500);
    expect(credit.reference).toBe("SALARY");
    expect(credit.externalId).toBe("BANKREF002");
    // No :86: and a usable reference -> reference becomes the description.
    expect(credit.description).toBe("SALARY");
    expect(credit.counterparty).toBeUndefined();
  });

  it("attaches the opening-balance currency to every transaction", () => {
    const txns = parser.parse(SIMPLE_STATEMENT);
    expect(txns.map((t) => t.currency)).toEqual(["CHF", "CHF"]);
  });
});

// --- amount & date parsing ------------------------------------------------

describe("amount and date parsing", () => {
  it("reads the comma as the decimal separator", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260602D1234,56NTRFNONREF",
      ":62F:D260602CHF1234,56",
    );
    expect(parser.parse(doc)[0].amount).toBe(1234.56);
  });

  it("parses a line without an entry date", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260602C10,00NTRFNONREF",
      ":62F:C260602CHF10,00",
    );
    const [txn] = parser.parse(doc);
    expect(txn.date).toBe("2026-06-02");
    expect(txn.amount).toBe(10);
    expect(txn.direction).toBe("credit");
  });

  it("resolves the two-digit year against the 70 pivot", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C990101USD0,00",
      ":61:990115D5,00NTRFNONREF",
      ":62F:D990115USD5,00",
    );
    expect(parser.parse(doc)[0].date).toBe("1999-01-15");
  });

  it("throws on an out-of-range date", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:261302D5,00NTRFNONREF",
    );
    expect(() => parser.parse(doc)).toThrow(Mt940ParseError);
  });

  it("throws on a malformed :61: line rather than dropping it", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:not-a-statement-line",
    );
    expect(() => parser.parse(doc)).toThrow(Mt940ParseError);
  });
});

// --- debit/credit marks ---------------------------------------------------

describe("debit/credit marks", () => {
  it("treats a reversal of a debit (RD) as a credit and of a credit (RC) as a debit", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260602RD20,00NTRFNONREF",
      ":61:260603RC30,00NTRFNONREF",
      ":62F:C260603CHF0,00",
    );
    const [reversalOfDebit, reversalOfCredit] = parser.parse(doc);
    expect(reversalOfDebit.direction).toBe("credit");
    expect(reversalOfDebit.amount).toBe(20);
    expect(reversalOfCredit.direction).toBe("debit");
    expect(reversalOfCredit.amount).toBe(30);
  });
});

// --- structured :86: ------------------------------------------------------

describe("structured :86: subfields", () => {
  const STRUCTURED = mt940(
    ":20:R",
    ":60F:C260601CHF0,00",
    ":61:2606050605D89,90NTRFNONREF//BANKREF",
    ":86:020?00ONLINE PAYMENT?20INVOICE 2026-0042?21THANK YOU?32ACME AG",
    ":62F:D260605CHF89,90",
  );

  it("combines booking text and remittance into the description", () => {
    const [txn] = parser.parse(STRUCTURED);
    expect(txn.description).toBe("ONLINE PAYMENT — INVOICE 2026-0042THANK YOU");
  });

  it("extracts the counterparty from ?32/?33", () => {
    const [txn] = parser.parse(STRUCTURED);
    expect(txn.counterparty).toBe("ACME AG");
  });

  it("concatenates a subfield wrapped across continuation lines", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260605D10,00NTRFNONREF",
      ":86:020?00PAYMENT?20FIRST PART ",
      "?21SECOND PART?32SHOP",
      ":62F:D260605CHF10,00",
    );
    const [txn] = parser.parse(doc);
    expect(txn.description).toBe("PAYMENT — FIRST PART SECOND PART");
    expect(txn.counterparty).toBe("SHOP");
  });
});

// --- SWIFT envelope & continuation ---------------------------------------

describe("SWIFT block envelope and multi-statement input", () => {
  it("unwraps a {4:..-} block 4 envelope", () => {
    const doc = mt940(
      "{1:F01BANKCHZZAXXX0000000000}{2:O9401200260601BANKCHZZAXXX00000000002606011200N}{4:",
      ":20:STMT",
      ":60F:C260601CHF0,00",
      ":61:260602D12,00NTRFNONREF",
      ":86:COFFEE",
      ":62F:D260602CHF12,00",
      "-}",
    );
    const txns = parser.parse(doc);
    expect(txns).toHaveLength(1);
    expect(txns[0].description).toBe("COFFEE");
  });

  it("parses transactions spanning multiple statements in one file", () => {
    const doc = mt940(
      ":20:STMT-1",
      ":60F:C260601CHF0,00",
      ":61:260602D5,00NTRFNONREF",
      ":86:FIRST",
      ":62F:D260602CHF5,00",
      ":20:STMT-2",
      ":60F:C260701EUR0,00",
      ":61:260702C9,00NTRFNONREF",
      ":86:SECOND",
      ":62F:C260702EUR9,00",
    );
    const txns = parser.parse(doc);
    expect(txns).toHaveLength(2);
    expect(txns[0].currency).toBe("CHF");
    expect(txns[1].currency).toBe("EUR");
    expect(txns[1].direction).toBe("credit");
  });

  it("reads :61: supplementary detail from its continuation line when no :86: follows", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260602D7,50NTRFNONREF//BANKREF",
      "ATM WITHDRAWAL CENTRAL STATION",
      ":62F:D260602CHF7,50",
    );
    const [txn] = parser.parse(doc);
    expect(txn.description).toBe("ATM WITHDRAWAL CENTRAL STATION");
    expect(txn.externalId).toBe("BANKREF");
  });
});

// --- empty & format detection --------------------------------------------

describe("edge cases and format detection", () => {
  it("returns no transactions for a statement with no :61: lines", () => {
    const doc = mt940(
      ":20:EMPTY",
      ":60F:C260601CHF100,00",
      ":62F:C260601CHF100,00",
    );
    expect(parser.parse(doc)).toEqual([]);
  });

  it("recognizes MT940 input via canParse", () => {
    expect(parser.canParse(SIMPLE_STATEMENT)).toBe(true);
  });

  it("rejects non-MT940 input via canParse without throwing", () => {
    expect(parser.canParse("date,amount,description\n2026-06-02,-5.00,coffee")).toBe(false);
    expect(parser.canParse("")).toBe(false);
  });

  it("exposes a shared singleton with the mt940 format id", () => {
    expect(mt940Parser).toBeInstanceOf(Mt940Parser);
    expect(mt940Parser.format).toBe("mt940");
  });
});
