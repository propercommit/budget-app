import { describe, it, expect } from "vitest";
import { csvField, csvRow, buildCsv } from "@/lib/csv";

describe("csvField", () => {
  it("passes plain text through unquoted", () => {
    expect(csvField("Groceries")).toBe("Groceries");
  });

  it("renders null and undefined as the empty cell", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });

  it("stringifies numbers and booleans", () => {
    expect(csvField(1029)).toBe("1029");
    expect(csvField(true)).toBe("true");
    expect(csvField(false)).toBe("false");
  });

  it("quotes a field containing a comma", () => {
    expect(csvField("Rent, utilities")).toBe('"Rent, utilities"');
  });

  it("quotes and doubles embedded quotes", () => {
    expect(csvField('the "big" one')).toBe('"the ""big"" one"');
  });

  it("quotes fields containing line breaks", () => {
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
    expect(csvField("line1\r\nline2")).toBe('"line1\r\nline2"');
  });
});

describe("csvRow", () => {
  it("joins escaped fields with commas", () => {
    expect(csvRow(["a", "b,c", null, 5])).toBe('a,"b,c",,5');
  });
});

describe("buildCsv", () => {
  it("renders title, header, and rows per section, blank-line separated, CRLF terminated", () => {
    const csv = buildCsv([
      { title: "First", header: ["A", "B"], rows: [["1", "2"]] },
      { title: "Second", header: ["C"], rows: [["x"], ["y"]] },
    ]);

    expect(csv).toBe(
      "First\r\nA,B\r\n1,2\r\n\r\nSecond\r\nC\r\nx\r\ny\r\n"
    );
  });

  it("renders a section with no rows as just title and header", () => {
    expect(buildCsv([{ title: "Empty", header: ["A"], rows: [] }])).toBe("Empty\r\nA\r\n");
  });
});
