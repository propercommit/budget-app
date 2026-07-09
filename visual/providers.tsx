/**
 * Shared provider wrapper for mounted components.
 *
 * Most feature components read `useSettings()` (for `formatAmount` / date
 * formatting) and throw outside a `SettingsProvider`. The provider fetches
 * settings on mount; in the harness that request fails and it falls back to its
 * built-in defaults (USD, MM/DD/YYYY) — deterministic and identical to a fresh
 * user, so screenshots are stable.
 *
 * Pass `currency` to seed a specific currency (e.g. "CHF") for a screenshot —
 * the 3-letter symbols are wider than "$" and exercise amount-slot layout.
 */
import type { ReactNode } from "react";
import { SettingsProvider } from "@/lib/settings-context";
import type { Currency } from "@/lib/constants";

export function Providers({ children, currency }: { children: ReactNode; currency?: Currency }) {
  const initialSettings = currency === undefined ? undefined : { currency };

  return <SettingsProvider initialSettings={initialSettings}>{children}</SettingsProvider>;
}
