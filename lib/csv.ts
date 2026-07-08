/**
 * Minimal RFC 4180 CSV building blocks for the account data export.
 *
 * Kept dependency-free and server-safe: the export route assembles the file
 * from these primitives instead of hand-concatenating strings, so quoting is
 * correct in exactly one place. Lines are joined with CRLF (the RFC 4180 line
 * terminator, and what spreadsheet apps expect).
 */

/** Everything a CSV cell can hold before serialisation. */
export type CsvValue = string | number | boolean | null | undefined;

/** One titled block of the export file: a title line, a header row, data rows. */
export type CsvSection = {
  title: string;
  header: string[];
  rows: CsvValue[][];
};

/**
 * Serialise a single cell. `null`/`undefined` become the empty cell; the field
 * is quoted only when it contains a comma, quote, or line break, with embedded
 * quotes doubled per RFC 4180.
 */
export function csvField(value: CsvValue): string {

  if (value === null || value === undefined) return "";

  const text = String(value);

  if (/[",\r\n]/.test(text) === false) return text;

  return `"${text.replaceAll('"', '""')}"`;
}

/** Serialise one row of cells (no trailing line break). */
export function csvRow(values: CsvValue[]): string {
  return values.map(csvField).join(",");
}

/**
 * Assemble the full export file: each section renders as its title line, a
 * header row, then its data rows; sections are separated by one blank line.
 * Ends with a trailing CRLF so the last record is properly terminated.
 */
export function buildCsv(sections: CsvSection[]): string {

  const blocks = sections.map((section) => {

    const lines = [csvRow([section.title]), csvRow(section.header), ...section.rows.map(csvRow)];

    return lines.join("\r\n");
  });

  return blocks.join("\r\n\r\n") + "\r\n";
}
