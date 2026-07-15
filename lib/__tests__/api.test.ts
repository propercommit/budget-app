import { describe, it, expect, vi, beforeEach } from "vitest";
import { confirmReceipt, deleteReceipt } from "@/lib/api";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
    fetchMock.mockReset();
});

describe("lib/api receipt transport", () => {
    it("sends the confirm PUT with keepalive so it survives a page unload", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ receiptPath: "u1/e1", receiptSizeBytes: 123 }), {
                status: 200,
                headers: { "content-type": "application/json" },
            })
        );

        const result = await confirmReceipt("e1");

        expect(result).toEqual({ receiptPath: "u1/e1", receiptSizeBytes: 123 });
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/entries/e1/receipt",
            expect.objectContaining({ method: "PUT", keepalive: true })
        );
    });

    it("does not set keepalive on other receipt calls — the flag is confirm-only", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

        await deleteReceipt("e1");

        const init = fetchMock.mock.calls[0][1] as RequestInit;

        expect(init.method).toBe("DELETE");
        expect(init.keepalive).toBeUndefined();
    });
});
