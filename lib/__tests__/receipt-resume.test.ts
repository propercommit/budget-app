// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    PENDING_RECEIPT_TTL_MS,
    addPendingReceipt,
    clearPendingReceipt,
    pendingReceiptKey,
    readPendingReceipts,
    resumeOutcome,
} from "@/lib/receipt-resume";
import { WELCOME_BANNER_DISMISSED_KEY } from "@/lib/first-run";

const keyFor = pendingReceiptKey;

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("receipt-resume markers", () => {
    it("round-trips a marker through add and read", () => {
        addPendingReceipt("e1", "Coffee");

        const markers = readPendingReceipts();

        expect(markers).toHaveLength(1);
        expect(markers[0].entryId).toBe("e1");
        expect(markers[0].entryName).toBe("Coffee");
        expect(typeof markers[0].startedAt).toBe("number");
    });

    it("re-arming the same entry overwrites the marker and refreshes startedAt", () => {
        vi.spyOn(Date, "now").mockReturnValueOnce(1_000).mockReturnValue(2_000);

        addPendingReceipt("e1", "Coffee");

        addPendingReceipt("e1", "Coffee");

        const markers = readPendingReceipts();

        expect(markers).toHaveLength(1);
        expect(markers[0].startedAt).toBe(2_000);
    });

    it("clear removes only the targeted marker", () => {
        addPendingReceipt("e1", "Coffee");

        addPendingReceipt("e2", "Groceries");

        clearPendingReceipt("e1");

        const markers = readPendingReceipts();

        expect(markers).toHaveLength(1);
        expect(markers[0].entryId).toBe("e2");
        expect(localStorage.getItem(keyFor("e1"))).toBeNull();
    });

    it("prunes expired markers from storage on read", () => {
        localStorage.setItem(
            keyFor("stale"),
            JSON.stringify({ entryId: "stale", entryName: "Old", startedAt: Date.now() - PENDING_RECEIPT_TTL_MS - 1_000 })
        );

        expect(readPendingReceipts()).toEqual([]);
        expect(localStorage.getItem(keyFor("stale"))).toBeNull();
    });

    it("skips and removes corrupt or wrong-shape values under the prefix", () => {
        localStorage.setItem(keyFor("bad-json"), "{not json");

        localStorage.setItem(keyFor("bad-shape"), JSON.stringify({ entryId: 42 }));

        expect(readPendingReceipts()).toEqual([]);
        expect(localStorage.getItem(keyFor("bad-json"))).toBeNull();
        expect(localStorage.getItem(keyFor("bad-shape"))).toBeNull();
    });

    it("leaves unrelated planbudget keys untouched", () => {
        localStorage.setItem(WELCOME_BANNER_DISMISSED_KEY, "1");

        addPendingReceipt("e1", "Coffee");

        clearPendingReceipt("e1");

        expect(readPendingReceipts()).toEqual([]);
        expect(localStorage.getItem(WELCOME_BANNER_DISMISSED_KEY)).toBe("1");
    });

    it("returns markers oldest first", () => {
        vi.spyOn(Date, "now").mockReturnValueOnce(2_000).mockReturnValueOnce(1_000).mockReturnValue(3_000);

        addPendingReceipt("newer", "B");

        addPendingReceipt("older", "A");

        const markers = readPendingReceipts();

        expect(markers.map((m) => m.entryId)).toEqual(["older", "newer"]);
    });
});

describe("resumeOutcome", () => {
    it.each([
        [404, "forget"],
        [null, "keep"],
        [401, "keep"],
        [500, "keep"],
        [503, "keep"],
        [409, "reattach"],
        [413, "reattach"],
        [415, "reattach"],
    ] as const)("status %s → %s", (status, expected) => {
        expect(resumeOutcome(status)).toBe(expected);
    });
});
