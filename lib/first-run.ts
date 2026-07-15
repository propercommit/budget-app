import { IncomeSource, SpendingItem } from "./types";

/** localStorage key for the welcome banner's dismissed flag (per-browser; see `WelcomeBanner`). */
export const WELCOME_BANNER_DISMISSED_KEY = "planbudget.welcome-banner-dismissed";

/**
 * Whether the account has any budgeting data in the loaded window — a spending
 * item in any loaded month, or an income source in either list (the selected
 * month's or the cross-month one; they can differ because the cross-month list
 * spans the whole 12-month window).
 *
 * The first-run surfaces (welcome banner, trends and budget-overview empty
 * states) key off the negation. Month buckets may exist empty — materializing
 * an empty month stores `[]` — so bucket presence alone is not data.
 */
export function hasAccountData(
    spendingData: Record<string, SpendingItem[]>,
    incomeSources: IncomeSource[],
    allIncomeSources: IncomeSource[],
): boolean {

    const hasSpendingItems = Object.values(spendingData).some(items => items.length > 0);

    return hasSpendingItems || incomeSources.length > 0 || allIncomeSources.length > 0;
}
