export const VALID_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"] as const;
export const VALID_DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;

export type Currency = typeof VALID_CURRENCIES[number];
export type DateFormat = typeof VALID_DATE_FORMATS[number];

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