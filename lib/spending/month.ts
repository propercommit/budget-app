/**
 * Derives the zero-padded "YYYY-MM" month an entry belongs to (D19) from its
 * date.
 *
 * Uses UTC getters deliberately: client dates arrive as "YYYY-MM-DD" strings,
 * which `new Date()` parses as UTC midnight — local getters would shift a
 * month-boundary date into the previous month for any timezone west of UTC.
 * For those strings this is exactly `date.slice(0, 7)`.
 */
export function monthOfDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * "July 2026"-style label for a "YYYY-MM" month — the app's single month-name
 * formatter (deliberately hardcoded en-US, bypassing the user's dateFormat
 * setting, matching the original MonthPicker behavior).
 */
export function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
