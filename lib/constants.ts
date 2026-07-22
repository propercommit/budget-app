export const VALID_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"] as const;
export const VALID_DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;

export type Currency = typeof VALID_CURRENCIES[number];
export type DateFormat = typeof VALID_DATE_FORMATS[number];

/**
 * Product-default settings for a user with no `UserSettings` row yet — what
 * the settings GET materializes on first read, and what the account export
 * reports when no row exists. Both routes must agree, so it lives here.
 */
export const DEFAULT_USER_SETTINGS = {
  currency: "USD" as Currency,
  dateFormat: "MM/DD/YYYY" as DateFormat,
  darkMode: false,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CHF: "CHF",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
};

export const CURRENCY_OPTIONS = VALID_CURRENCIES.map(code => ({
  code,
  symbol: CURRENCY_SYMBOLS[code],
  label: `${code} (${CURRENCY_SYMBOLS[code]})`,
}));

export const DATE_FORMAT_OPTIONS = VALID_DATE_FORMATS.map(format => ({
  value: format,
  label: format,
}));

export const DATE_FORMAT_TOKENS: Record<DateFormat, string> = {
  "MM/DD/YYYY": "MMM d, yyyy",
  "DD/MM/YYYY": "d MMM yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

export const DATE_FORMAT_SHORT_TOKENS: Record<DateFormat, string> = {
  "MM/DD/YYYY": "MMM dd",
  "DD/MM/YYYY": "dd MMM",
  "YYYY-MM-DD": "MM-dd",
};

export const DATE_FORMAT_FULL_TOKENS: Record<DateFormat, string> = {
  "MM/DD/YYYY": "EEEE, MMMM d, yyyy",
  "DD/MM/YYYY": "EEEE d MMMM yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd, EEEE",
};

/** Shared by every category-delete affordance so the warning never drifts. */
export const CATEGORY_DELETE_WARNING = "Are you sure? This will delete all spending items in this category. This cannot be undone.";

/**
 * Default icon for a newly created income source — the add popin's initial
 * selection and the icon synthesized for imported income rows. One owner so
 * the two paths can never drift.
 */
export const DEFAULT_INCOME_ICON = "piggy-bank";
