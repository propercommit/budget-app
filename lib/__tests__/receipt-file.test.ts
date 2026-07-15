import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareReceiptFile, type PreparedReceipt } from "@/lib/receipt-file";
import { MAX_RECEIPT_BYTES } from "@/lib/receipt-storage";
import { compressImage } from "@/lib/compress-image";

vi.mock("@/lib/compress-image", () => ({ compressImage: vi.fn() }));

const compressImageMock = vi.mocked(compressImage);

function fileOfSize(size: number, name: string, type: string): File {
  return new File([new Uint8Array(size)], name, { type });
}

/** Narrows a PreparedReceipt to the ready branch so `.file` identity can be asserted. */
function expectReady(result: PreparedReceipt): File {

  if (result.kind !== "ready") throw new Error(`expected kind "ready", got "${result.kind}"`);

  return result.file;
}

describe("prepareReceiptFile", () => {
  beforeEach(() => {
    compressImageMock.mockReset();
  });

  it("returns the compressed file when compression succeeds within the cap", async () => {

    const original = fileOfSize(5_000, "receipt.jpg", "image/jpeg");
    const compressed = fileOfSize(1_000, "receipt.jpg", "image/jpeg");

    compressImageMock.mockResolvedValueOnce(compressed);

    const result = await prepareReceiptFile(original);

    expect(expectReady(result)).toBe(compressed);

    expect(compressImageMock).toHaveBeenCalledExactlyOnceWith(original);
  });

  it("falls back to the original file when compression fails on an allowlisted type within the cap", async () => {

    const original = fileOfSize(5_000, "receipt.png", "image/png");

    compressImageMock.mockRejectedValueOnce(new Error("canvas decode failed"));

    const result = await prepareReceiptFile(original);

    expect(expectReady(result)).toBe(original);
  });

  it("accepts a raw-fallback file of exactly the cap size", async () => {

    const original = fileOfSize(MAX_RECEIPT_BYTES, "receipt.webp", "image/webp");

    compressImageMock.mockRejectedValueOnce(new Error("canvas decode failed"));

    const result = await prepareReceiptFile(original);

    expect(expectReady(result)).toBe(original);
  });

  it("rejects application/pdf without invoking compression", async () => {

    const pdf = fileOfSize(100, "doc.pdf", "application/pdf");

    expect(await prepareReceiptFile(pdf)).toEqual({ kind: "unsupported-type" });

    expect(compressImageMock).not.toHaveBeenCalled();
  });

  it("rejects image/heic without invoking compression", async () => {

    const heic = fileOfSize(100, "photo.heic", "image/heic");

    expect(await prepareReceiptFile(heic)).toEqual({ kind: "unsupported-type" });

    expect(compressImageMock).not.toHaveBeenCalled();
  });

  it("returns too-large when the compressed output exceeds the cap", async () => {

    const original = fileOfSize(5_000, "big.jpg", "image/jpeg");

    compressImageMock.mockResolvedValueOnce(fileOfSize(MAX_RECEIPT_BYTES + 1, "big.jpg", "image/jpeg"));

    expect(await prepareReceiptFile(original)).toEqual({ kind: "too-large" });
  });

  it("returns too-large when the raw-fallback file exceeds the cap", async () => {

    const original = fileOfSize(MAX_RECEIPT_BYTES + 1, "big.webp", "image/webp");

    compressImageMock.mockRejectedValueOnce(new Error("canvas decode failed"));

    expect(await prepareReceiptFile(original)).toEqual({ kind: "too-large" });
  });
});
