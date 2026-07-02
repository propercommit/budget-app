/**
 * Shared provider wrapper for mounted components.
 *
 * Most feature components read `useSettings()` (for `formatAmount` / date
 * formatting) and throw outside a `SettingsProvider`. The provider fetches
 * settings on mount; in the harness that request fails and it falls back to its
 * built-in defaults (USD, MM/DD/YYYY) — deterministic and identical to a fresh
 * user, so screenshots are stable.
 */
import type { ReactNode } from "react";
import { SettingsProvider } from "@/lib/settings-context";

export function Providers({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
