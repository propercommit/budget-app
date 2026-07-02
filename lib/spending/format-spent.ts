/**
 * Presentation rule for a card's net `spent`, shared by the collapsed and
 * expanded card headers and the item detail popin.
 *
 * A negative total is valid cash-month data (credits exceeded debits — see
 * lib/spending/math.ts) but a bare "-89.12" header reads as nonsense to a
 * user. Render it as "+89.12" in green instead, mirroring how credit entries
 * display: the sign communicates "net money back this month". Positive totals
 * keep the default dark color. Display-only — never feed the flipped sign
 * back into any arithmetic.
 */
export function spentDisplay(totalSpent: number, formatAmount: (cents: number) => string): { label: string; color: string } {

    if (totalSpent < 0) return { label: `+${formatAmount(-totalSpent)}`, color: "#34C759" };

    return { label: formatAmount(totalSpent), color: "#1D1D1F" };
}
