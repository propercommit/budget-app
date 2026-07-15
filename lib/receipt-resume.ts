/**
 * Resume markers for in-flight receipt upload chains, so a refresh/quit
 * mid-chain surfaces on the next page load instead of losing the receipt
 * silently: a marker is written when the chain starts (use-spending's
 * uploadReceipt), cleared on every terminal outcome, and the dashboard's
 * mount-time resume re-runs the idempotent confirm for whatever is left —
 * healing uploads whose confirm never landed, and telling the user to
 * re-attach when the upload itself never finished.
 *
 * One localStorage key per entry (`planbudget.pending-receipt.<entryId>`):
 * setItem/removeItem are atomic per key, so concurrent tabs can't clobber
 * each other the way a single JSON-array key would under read-modify-write.
 * Everything is best-effort — storage being unavailable (SSR, private mode,
 * quota) degrades to today's behavior (an inert orphan), never to a broken
 * upload chain.
 */

export interface PendingReceiptMarker {
    entryId: string;
    /** Feeds the re-attach toast copy on an unrecoverable resume. */
    entryName: string;
    /** Epoch ms of the (latest) chain start — drives the TTL. */
    startedAt: number;
}

export const PENDING_RECEIPT_KEY_PREFIX = "planbudget.pending-receipt.";

/** The one place the marker key shape is defined — module and tests share it. */
export function pendingReceiptKey(entryId: string): string {
    return `${PENDING_RECEIPT_KEY_PREFIX}${entryId}`;
}

/**
 * What a failed resume confirm means for the marker:
 * - `forget` — the entry is gone (404); clear silently.
 * - `keep` — transient (network, 5xx) or a token-refresh race at mount (401);
 *   the marker stays for the next load, bounded by the TTL.
 * - `reattach` — a definitive 4xx (409 not-uploaded, 413, 415): the upload
 *   never finished or was reaped; only re-attaching can fix it — clear and
 *   tell the user.
 */
export function resumeOutcome(status: number | null): "forget" | "keep" | "reattach" {

    if (status === 404) return "forget";

    if (status === null || status === 401 || status >= 500) return "keep";

    return "reattach";
}

/**
 * Markers older than this are pruned unread: an orphaned object is inert by
 * design, and a "didn't finish uploading" toast about a day-old entry
 * confuses more than it helps. Also bounds retention for markers kept across
 * transient resume failures (network/5xx/401).
 */
export const PENDING_RECEIPT_TTL_MS = 86_400_000;

function isPendingReceiptMarker(value: unknown): value is PendingReceiptMarker {

    if (typeof value !== "object" || value === null) return false;

    const candidate = value as { entryId?: unknown; entryName?: unknown; startedAt?: unknown };

    return typeof candidate.entryId === "string"
        && typeof candidate.entryName === "string"
        && typeof candidate.startedAt === "number";
}

/** Arms (or re-arms, refreshing `startedAt`) the marker for an in-flight chain. */
export function addPendingReceipt(entryId: string, entryName: string): void {

    if (typeof window === "undefined") return;

    const marker: PendingReceiptMarker = { entryId, entryName, startedAt: Date.now() };

    try {
        window.localStorage.setItem(pendingReceiptKey(entryId), JSON.stringify(marker));
    } catch (error) {
        console.error("Failed to write pending-receipt marker:", error);
    }
}

/** Removes the marker — called on every terminal chain/resume outcome. */
export function clearPendingReceipt(entryId: string): void {

    if (typeof window === "undefined") return;

    try {
        window.localStorage.removeItem(pendingReceiptKey(entryId));
    } catch (error) {
        console.error("Failed to clear pending-receipt marker:", error);
    }
}

/**
 * All fresh markers, oldest first; expired and malformed entries are pruned
 * from storage as they are read.
 */
export function readPendingReceipts(): PendingReceiptMarker[] {

    if (typeof window === "undefined") return [];

    const markers: PendingReceiptMarker[] = [];

    try {
        const keys: string[] = [];

        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);

            if (key !== null && key.startsWith(PENDING_RECEIPT_KEY_PREFIX)) keys.push(key);
        }

        for (const key of keys) {
            const raw = window.localStorage.getItem(key);

            let parsed: unknown = null;

            try {
                parsed = raw === null ? null : JSON.parse(raw);
            } catch {
                parsed = null;
            }

            if (isPendingReceiptMarker(parsed) === false || Date.now() - parsed.startedAt > PENDING_RECEIPT_TTL_MS) {
                window.localStorage.removeItem(key);
                continue;
            }

            markers.push(parsed);
        }
    } catch (error) {
        console.error("Failed to read pending-receipt markers:", error);
    }

    return markers.sort((a, b) => a.startedAt - b.startedAt);
}
