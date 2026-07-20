/**
 * The commit route's validation caps, shared with the review client so the
 * pick/review gates can never drift from what the server accepts — a drifted
 * cap either blocks importable files or walks the user into a whole-batch
 * 400 after a full review.
 */

/** Transactions per import batch. */
export const MAX_IMPORT_TRANSACTIONS = 1000;

/** Per-entry write cap, integer cents (= 100,000,000.00 major units). */
export const MAX_AMOUNT_CENTS = 10_000_000_000;

/** Learn-key length cap (rule match keys). */
export const MAX_LEARN_KEY_LENGTH = 100;

/** Import provenance filename cap. */
export const MAX_FILENAME_LENGTH = 255;
