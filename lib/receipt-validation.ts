/** The receipt types the app accepts end-to-end (render surface is `<img>`). */
export type ReceiptMimeType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Identifies a receipt image by its magic bytes — the authoritative content
 * gate for the confirm step (the bucket's `allowed_mime_types` only checks the
 * client-DECLARED Content-Type). The allowlist is deliberately JPEG/PNG/WebP:
 * it must match the bucket's mime array and the client-side raw-fallback
 * allowlist; HEIC and PDF are excluded per D27 (no cross-browser `<img>`
 * support). Change all three lists together.
 *
 * Returns `null` for anything unrecognized, including buffers shorter than 12
 * bytes — no real image is that small, and the WebP check needs offsets 8-11.
 */
export function sniffReceiptType(head: Uint8Array): ReceiptMimeType | null {

    if (head.length < 12) return null;

    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";

    const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
        && head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a;

    if (isPng) return "image/png";

    const isRiff = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
    const isWebp = head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;

    if (isRiff && isWebp) return "image/webp";

    return null;
}
