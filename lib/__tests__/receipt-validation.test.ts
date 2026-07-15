import { describe, it, expect } from "vitest";
import { sniffReceiptType } from "@/lib/receipt-validation";

/** Builds a buffer of `length` bytes starting with `head`, zero-padded after it. */
function padded(head: number[], length = 16): Uint8Array {

  const buf = new Uint8Array(length);

  buf.set(head);

  return buf;
}

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const WAVE = [0x57, 0x41, 0x56, 0x45];

describe("sniffReceiptType", () => {
  it("identifies JPEG from the FF D8 FF prefix", () => {
    expect(sniffReceiptType(padded(JPEG_HEAD))).toBe("image/jpeg");
  });

  it("identifies PNG from the 8-byte signature", () => {
    expect(sniffReceiptType(padded(PNG_SIGNATURE))).toBe("image/png");
  });

  it("identifies WebP from RIFF at 0-3 plus WEBP at 8-11", () => {

    const head = padded([...RIFF, 0x1a, 0x00, 0x00, 0x00, ...WEBP]);

    expect(sniffReceiptType(head)).toBe("image/webp");
  });

  it("returns null for unrecognized bytes", () => {
    expect(sniffReceiptType(padded([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]))).toBeNull();
  });

  it("returns null for an empty buffer", () => {
    expect(sniffReceiptType(new Uint8Array(0))).toBeNull();
  });

  it("returns null for a 3-byte buffer even with a valid JPEG prefix", () => {
    expect(sniffReceiptType(Uint8Array.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it("returns null for an 11-byte buffer even with a valid RIFF prefix", () => {

    const head = Uint8Array.from([...RIFF, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42]);

    expect(head).toHaveLength(11);

    expect(sniffReceiptType(head)).toBeNull();
  });

  it("returns null for a RIFF container that is not WebP", () => {

    const head = padded([...RIFF, 0x1a, 0x00, 0x00, 0x00, ...WAVE]);

    expect(sniffReceiptType(head)).toBeNull();
  });
});
