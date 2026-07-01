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
      amount: 5430,
      direction: "debit",
      description: "MIGROS SUPERMARKT ZUERICH",
      externalId: "BANKREF001",
      currency: "CHF",
    });
  });

  it("maps a credit line with no :86: and no reference, falling back to an empty description", () => {
    const [, credit] = parser.parse(SIMPLE_STATEMENT);
    expect(credit.direction).toBe("credit");
    expect(credit.amount).toBe(250000);
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
  it("reads the comma as the decimal separator, into integer minor units", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260602D1234,56NTRFNONREF",
      ":62F:D260602CHF1234,56",
    );
    expect(parser.parse(doc)[0].amount).toBe(123456);
  });

  it("right-pads a single fractional digit to whole cents", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260602C10,1NTRFNONREF",
      ":62F:C260602CHF10,10",
    );
    expect(parser.parse(doc)[0].amount).toBe(1010);
  });

  it("half-up rounds an amount carrying more than two fractional digits", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260602C10,999NTRFNONREF",
      ":62F:C260602CHF11,00",
    );
    expect(parser.parse(doc)[0].amount).toBe(1100);
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
    expect(txn.amount).toBe(1000);
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
    expect(reversalOfDebit.amount).toBe(2000);
    expect(reversalOfCredit.direction).toBe("debit");
    expect(reversalOfCredit.amount).toBe(3000);
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

// --- unstructured :86: type-code stripping --------------------------------

describe("unstructured :86: transaction-type code", () => {
  it("strips a leading UBS type code (e.g. Z04?) from the description", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:2607010701C3737,12NTRFNONREF//9999182ZC1852230",
      ":86:Z04?Gewerkschaft Unia",
      ":62F:C260701CHF3737,12",
    );
    const [txn] = parser.parse(doc);
    expect(txn.description).toBe("Gewerkschaft Unia");
  });

  it("leaves a description without a type-code prefix untouched", () => {
    const doc = mt940(
      ":20:R",
      ":60F:C260601CHF0,00",
      ":61:260602D7,50NTRFNONREF//BANKREF",
      ":86:ATM WITHDRAWAL CENTRAL STATION",
      ":62F:D260602CHF7,50",
    );
    const [txn] = parser.parse(doc);
    expect(txn.description).toBe("ATM WITHDRAWAL CENTRAL STATION");
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

// --- statement balances ---------------------------------------------------

describe("parseStatements exposes balances", () => {
  it("attaches the opening and closing balances (in cents) to the statement", () => {
    const [statement] = parser.parseStatements(SIMPLE_STATEMENT);
    expect(statement.openingBalance).toEqual({
      direction: "credit",
      amount: 100000,
      currency: "CHF",
      date: "2026-06-01",
    });
    expect(statement.closingBalance).toEqual({
      direction: "credit",
      amount: 344570,
      currency: "CHF",
      date: "2026-06-03",
    });
  });

  it("splits a multi-statement file, each with its own balances", () => {
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
    const statements = parser.parseStatements(doc);
    expect(statements).toHaveLength(2);
    expect(statements[0].closingBalance?.currency).toBe("CHF");
    expect(statements[1].closingBalance?.currency).toBe("EUR");
  });
});

// --- reconciliation in integer cents --------------------------------------

describe("reconcile", () => {
  it("reconciles a clean statement: opening + movements === closing", () => {
    // C1000,00 opening; −54,30 debit; +2500,00 credit -> C3445,70 closing.
    const [result] = parser.reconcile(SIMPLE_STATEMENT);
    expect(result.reconciled).toBe(true);
    expect(result.movement).toBe(244570);
    expect(result.expectedClosing).toBe(344570);
    expect(result.actualClosing).toBe(344570);
    expect(result.difference).toBe(0);
  });

  it("reconciles amounts that would drift when summed as floats", () => {
    const doc = mt940(
      ":20:DRIFT",
      ":60F:C260601CHF0,00",
      ":61:260602C10,10NTRFNONREF",
      ":61:260602C20,20NTRFNONREF",
      ":61:260602C0,30NTRFNONREF",
      ":62F:C260602CHF30,60",
    );
    const [result] = parser.reconcile(doc);
    expect(result.reconciled).toBe(true);
    expect(result.movement).toBe(3060);
    expect(result.difference).toBe(0);

    // The very same amounts summed as major-unit floats miss 30.60 exactly —
    // an equality check on that basis would spuriously reject a clean import.
    expect(10.1 + 20.2 + 0.3).not.toBe(30.6);
  });

  it("handles a debit (overdrawn) closing balance", () => {
    const doc = mt940(
      ":20:OD",
      ":60F:C260601CHF10,00",
      ":61:260602D25,00NTRFNONREF",
      ":62F:D260602CHF15,00",
    );
    const [result] = parser.reconcile(doc);
    expect(result.reconciled).toBe(true);
    expect(result.expectedClosing).toBe(-1500);
    expect(result.actualClosing).toBe(-1500);
  });

  it("flags a statement whose closing balance does not match the movements", () => {
    const doc = mt940(
      ":20:BAD",
      ":60F:C260601CHF100,00",
      ":61:260602D30,00NTRFNONREF",
      ":62F:C260602CHF80,00", // should be 70,00
    );
    const [result] = parser.reconcile(doc);
    expect(result.reconciled).toBe(false);
    expect(result.expectedClosing).toBe(7000);
    expect(result.actualClosing).toBe(8000);
    expect(result.difference).toBe(-1000);
  });

  it("counts reversals (RD/RC) with their effective direction", () => {
    const doc = mt940(
      ":20:REV",
      ":60F:C260601CHF0,00",
      ":61:260602RD20,00NTRFNONREF", // reversal of a debit -> +20,00
      ":61:260603RC30,00NTRFNONREF", // reversal of a credit -> −30,00
      ":62F:D260603CHF10,00",
    );
    const [result] = parser.reconcile(doc);
    expect(result.reconciled).toBe(true);
    expect(result.movement).toBe(-1000);
    expect(result.actualClosing).toBe(-1000);
  });

  it("does not reconcile when the closing balance is absent", () => {
    const doc = mt940(
      ":20:NOCLOSE",
      ":60F:C260601CHF0,00",
      ":61:260602C10,00NTRFNONREF",
    );
    const [result] = parser.reconcile(doc);
    expect(result.reconciled).toBe(false);
    expect(result.actualClosing).toBeUndefined();
    expect(result.difference).toBe(1000);
  });

  it("returns one result per statement in a multi-statement file", () => {
    const doc = mt940(
      ":20:STMT-1",
      ":60F:C260601CHF0,00",
      ":61:260602D5,00NTRFNONREF",
      ":62F:D260602CHF5,00",
      ":20:STMT-2",
      ":60F:C260701EUR100,00",
      ":61:260702C9,00NTRFNONREF",
      ":62F:C260702EUR109,00",
    );
    const results = parser.reconcile(doc);
    expect(results).toHaveLength(2);
    expect(results[0].reconciled).toBe(true);
    expect(results[1].reconciled).toBe(true);
  });
});
