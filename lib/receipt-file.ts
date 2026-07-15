import { compressImage } from "@/lib/compress-image";
import { MAX_RECEIPT_BYTES } from "@/lib/receipt-storage";

/**
 * What the entry form's save payload says about the receipt. Never crosses
 * the wire — Dashboard forwards it to the spending hook, which turns `attach`
 * into the upload chain and `remove` into a DELETE on the receipt route.
 */
export type ReceiptAction =
    | { action: "keep" }
    | { action: "remove" }
    | { action: "attach"; file: File };

/**
 * Client-side allowlist for receipt files. Must match the confirm step's
 * magic-byte sniff (lib/receipt-validation.ts) and the bucket's
 * `allowed_mime_types` — change all three together. HEIC/PDF are excluded per
 * D27: the render surface is `<img>`.
 */
const RECEIPT_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PreparedReceipt =
    | { kind: "ready"; file: File }
    | { kind: "unsupported-type" }
    | { kind: "too-large" };

/**
 * Prepares a selected file for upload: canvas compression for images, with
 * the D27 raw fallback — a file whose type is allowlisted but fails
 * compression is sent as-is (bounded by the 10 MB storage cap) instead of
 * being rejected like today. Types outside the allowlist never upload.
 */
export async function prepareReceiptFile(file: File): Promise<PreparedReceipt> {

    if (RECEIPT_FILE_TYPES.includes(file.type) === false) return { kind: "unsupported-type" };

    let prepared: File;

    try {
        prepared = await compressImage(file);
    } catch {
        // Raw fallback (decided): compression failed on an allowlisted image —
        // upload the original bytes, provided they fit the storage cap.
        prepared = file;
    }

    if (prepared.size > MAX_RECEIPT_BYTES) return { kind: "too-large" };

    return { kind: "ready", file: prepared };
}
