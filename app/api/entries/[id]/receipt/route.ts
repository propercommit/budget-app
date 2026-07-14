import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpendingEntry } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
    MAX_RECEIPT_BYTES,
    RECEIPT_QUOTA_BYTES,
    RECEIPT_SIGNED_URL_TTL_SECONDS,
    RECEIPTS_BUCKET,
    receiptObjectPath,
} from "@/lib/receipt-storage";
import { sniffReceiptType } from "@/lib/receipt-validation";

/**
 * Receipt sub-resource of an entry. The file itself never crosses this route:
 * POST issues a signed upload token (the browser uploads straight to Storage,
 * bypassing the platform's 4.5 MB function-body limit), PUT confirms an upload
 * (the AUTHORITATIVE validation — size from Storage metadata, magic-byte
 * sniff, per-user quota; the object is deleted on any failure), GET mints a
 * short-lived signed read URL from the DB path only, and DELETE clears the DB
 * pointer first and then removes the object best-effort.
 *
 * Error vocabulary (structured codes the client switches on):
 * `quota_exceeded` 413 · `receipt_too_large` 413 · `unsupported_type` 415 ·
 * `receipt_not_uploaded` 409 · `no_receipt` 404.
 */

/**
 * Loads the entry and verifies ownership through its series. Returns `null`
 * both when the entry is missing and when it belongs to another user — the
 * caller answers 404 either way (existence-hiding, matching the entries
 * routes).
 */
async function findOwnedEntry(id: string, userId: string): Promise<SpendingEntry | null> {

    const entry = await prisma.spendingEntry.findUnique({
        where: { id },
        include: { spendingItem: { include: { series: true } } },
    });

    if (entry === null) return null;

    if (entry.spendingItem.series.userId !== userId) return null;

    return entry;
}

/**
 * Sum of `receiptSizeBytes` over every OTHER entry of the user — the base the
 * 50 MB cap is checked against, so replacing an entry's receipt frees the old
 * size instead of double-counting it.
 */
async function receiptBytesUsedByOtherEntries(userId: string, entryId: string): Promise<number> {

    const aggregate = await prisma.spendingEntry.aggregate({
        _sum: { receiptSizeBytes: true },
        where: { spendingItem: { series: { userId } }, id: { not: entryId } },
    });

    return aggregate._sum.receiptSizeBytes ?? 0;
}

/** Best-effort object removal — failures are logged, never surfaced. */
async function removeReceiptObject(admin: SupabaseClient, path: string): Promise<void> {

    const { error } = await admin.storage.from(RECEIPTS_BUCKET).remove([path]);

    if (error !== null) console.error("[Receipt] Failed to remove object", path, error);
}

/**
 * Discards a failed upload: removes the object, and — when the entry's
 * current pointer references this same fixed path (a replacement whose
 * confirm failed) — clears `receiptPath`/`receiptSizeBytes` so the entry
 * degrades to "no receipt" instead of pointing at an object that no longer
 * exists.
 */
async function discardFailedUpload(admin: SupabaseClient, entry: SpendingEntry, path: string): Promise<void> {

    await removeReceiptObject(admin, path);

    if (entry.receiptPath !== path) return;

    try {
        await prisma.spendingEntry.updateMany({
            where: { id: entry.id },
            data: { receiptPath: null, receiptSizeBytes: null },
        });
    } catch (error) {
        console.error("[Receipt] Failed to clear dangling receipt pointer", entry.id, error);
    }
}

type HeadReadResult =
    | { kind: "ok"; head: Uint8Array; totalBytes: number | null }
    | { kind: "unreadable" };

/**
 * Reads the first bytes of the object for the magic-byte sniff, plus the total
 * size the SAME response reports (Content-Range on 206, Content-Length on
 * 200) so the caller can detect a concurrent overwrite between `info()` and
 * this read.
 *
 * The `nonce` query param is load-bearing: the object endpoint sits behind a
 * CDN that caches even Authorization-bearing responses, so without it a
 * replacement's confirm could sniff the PREVIOUS object's cached head bytes.
 * The Range header is best-effort — only the first chunk is read and the rest
 * cancelled, which is correct whether the server answers 206 or a full 200.
 */
async function readObjectHead(path: string): Promise<HeadReadResult> {

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

    if (serviceRoleKey === undefined) return { kind: "unreadable" };

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${RECEIPTS_BUCKET}/${path}?nonce=${crypto.randomUUID()}`;

    let response: Response;

    try {
        response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
                Range: "bytes=0-31",
            },
        });
    } catch (error) {
        console.error("[Receipt] Head read failed", path, error);
        return { kind: "unreadable" };
    }

    if (response.ok === false || response.body === null) return { kind: "unreadable" };

    let totalBytes: number | null = null;

    const contentRange = response.headers.get("content-range");
    const contentLength = response.headers.get("content-length");

    if (contentRange !== null) {
        const total = Number(contentRange.split("/")[1]);

        if (Number.isFinite(total)) totalBytes = total;
    } else if (contentLength !== null) {
        const total = Number(contentLength);

        if (Number.isFinite(total)) totalBytes = total;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];

    let received = 0;

    while (received < 12) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);

        received += value.length;
    }

    await reader.cancel().catch(() => undefined);

    if (received < 12) return { kind: "unreadable" };

    const head = new Uint8Array(Math.min(received, 32));

    let offset = 0;

    for (const chunk of chunks) {
        if (offset >= head.length) break;

        head.set(chunk.subarray(0, Math.min(chunk.length, head.length - offset)), offset);

        offset += chunk.length;
    }

    return { kind: "ok", head, totalBytes };
}

// GET /api/entries/[id]/receipt - Mint a signed read URL from the DB path
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const entry = await findOwnedEntry(id, user.id);

        if (entry === null) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

        // Reads mint ONLY from the DB pointer — never probe the bucket. A 404
        // here is a real state ("this entry has no receipt"), not an error;
        // the client clears its local receipt state on it.
        if (entry.receiptPath === null) return NextResponse.json({ error: "no_receipt" }, { status: 404 });

        const admin = getSupabaseAdmin();

        const { data, error } = await admin.storage
            .from(RECEIPTS_BUCKET)
            .createSignedUrl(entry.receiptPath, RECEIPT_SIGNED_URL_TTL_SECONDS);

        if (error !== null || data === null) {
            console.error("[Receipt GET] Failed to mint signed URL:", error);
            return NextResponse.json({ error: "Failed to load receipt" }, { status: 500 });
        }

        return NextResponse.json({ url: data.signedUrl });
    } catch (error) {
        console.error("[Receipt GET] Failed:", error);
        return NextResponse.json({ error: "Failed to load receipt" }, { status: 500 });
    }
}

// POST /api/entries/[id]/receipt - Issue a signed upload token (preliminary checks only)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { sizeBytes } = body;

        // The claim is advisory — it sharpens the preliminary quota check so a
        // doomed upload fails before the bytes travel. The confirm step never
        // reads it; Storage metadata is the only trusted size.
        if (typeof sizeBytes !== "number" || Number.isInteger(sizeBytes) === false || sizeBytes <= 0) {
            return NextResponse.json({ error: "sizeBytes must be a positive integer" }, { status: 400 });
        }

        if (sizeBytes > MAX_RECEIPT_BYTES) {
            return NextResponse.json({ error: "receipt_too_large", maxBytes: MAX_RECEIPT_BYTES }, { status: 413 });
        }

        const entry = await findOwnedEntry(id, user.id);

        if (entry === null) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

        const usedBytes = await receiptBytesUsedByOtherEntries(user.id, id);

        if (usedBytes + sizeBytes > RECEIPT_QUOTA_BYTES) {
            return NextResponse.json(
                { error: "quota_exceeded", quotaBytes: RECEIPT_QUOTA_BYTES, usedBytes },
                { status: 413 }
            );
        }

        const admin = getSupabaseAdmin();

        // `upsert: true` is load-bearing: it is what lets a re-upload overwrite
        // a stale or orphaned object at the fixed path (the self-heal the D27
        // layout depends on). Without it the second upload to a path 409s.
        const { data, error } = await admin.storage
            .from(RECEIPTS_BUCKET)
            .createSignedUploadUrl(receiptObjectPath(user.id, id), { upsert: true });

        if (error !== null || data === null) {
            console.error("[Receipt POST] Failed to issue upload token:", error);
            return NextResponse.json({ error: "Failed to issue upload token" }, { status: 500 });
        }

        return NextResponse.json({ path: data.path, token: data.token });
    } catch (error) {
        console.error("[Receipt POST] Failed:", error);
        return NextResponse.json({ error: "Failed to issue upload token" }, { status: 500 });
    }
}

// PUT /api/entries/[id]/receipt - Confirm an upload (the authoritative validation)
export async function PUT(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const admin = getSupabaseAdmin();

        // Recomputed server-side, never client-supplied — and namespaced under
        // the CALLER's uid, so the not-found cleanup below can only ever touch
        // the caller's own folder.
        const path = receiptObjectPath(user.id, id);

        const entry = await findOwnedEntry(id, user.id);

        if (entry === null) {
            // The entry died while the upload was in flight (its DELETE cleanup
            // ran before the object existed). This branch is the only reaper
            // for that orphan — cuid ids never recur, so nothing else would.
            await removeReceiptObject(admin, path);

            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        const { data: objectInfo, error: infoError } = await admin.storage.from(RECEIPTS_BUCKET).info(path);

        // Nothing at the fixed path: confirm was called before (or without) an
        // upload. Nothing to delete; the client retries the FULL chain.
        if (infoError !== null || objectInfo === null) {
            return NextResponse.json({ error: "receipt_not_uploaded" }, { status: 409 });
        }

        const size = objectInfo.size;

        // Storage metadata is the ONLY size ever trusted (decided).
        if (size === undefined || size === null) {
            await discardFailedUpload(admin, entry, path);

            return NextResponse.json({ error: "Failed to confirm receipt" }, { status: 500 });
        }

        if (size > MAX_RECEIPT_BYTES) {
            await discardFailedUpload(admin, entry, path);

            return NextResponse.json({ error: "receipt_too_large", maxBytes: MAX_RECEIPT_BYTES }, { status: 413 });
        }

        const headRead = await readObjectHead(path);

        if (headRead.kind === "unreadable") {
            await discardFailedUpload(admin, entry, path);

            return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
        }

        // The sniff read reports the size of whatever object it actually saw;
        // a mismatch with info() means a concurrent overwrite landed between
        // the two reads — fail retryably rather than record a size for bytes
        // that were never sniffed.
        if (headRead.totalBytes !== null && headRead.totalBytes !== size) {
            await discardFailedUpload(admin, entry, path);

            return NextResponse.json({ error: "receipt_not_uploaded" }, { status: 409 });
        }

        if (sniffReceiptType(headRead.head) === null) {
            await discardFailedUpload(admin, entry, path);

            return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
        }

        const usedBytes = await receiptBytesUsedByOtherEntries(user.id, id);

        if (usedBytes + size > RECEIPT_QUOTA_BYTES) {
            await discardFailedUpload(admin, entry, path);

            return NextResponse.json(
                { error: "quota_exceeded", quotaBytes: RECEIPT_QUOTA_BYTES, usedBytes },
                { status: 413 }
            );
        }

        // updateMany instead of update: a concurrent entry delete between the
        // ownership check and this write must yield a clean 404, not a P2025.
        const updated = await prisma.spendingEntry.updateMany({
            where: { id },
            data: { receiptPath: path, receiptSizeBytes: size },
        });

        if (updated.count === 0) {
            await removeReceiptObject(admin, path);

            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        return NextResponse.json({ receiptPath: path, receiptSizeBytes: size });
    } catch (error) {
        console.error("[Receipt PUT] Failed:", error);
        return NextResponse.json({ error: "Failed to confirm receipt" }, { status: 500 });
    }
}

// DELETE /api/entries/[id]/receipt - Remove a receipt (DB pointer first, object best-effort)
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthenticatedUser();

        if (user === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const entry = await findOwnedEntry(id, user.id);

        if (entry === null) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

        // DB first, one update: a failed storage delete leaves an inert,
        // unreachable orphan the next upload overwrites; the reverse order
        // could leave a DB pointer whose every read 404s. Cheaper failure
        // wins (decided).
        await prisma.spendingEntry.updateMany({
            where: { id },
            data: { receiptPath: null, receiptSizeBytes: null },
        });

        // Unconditional fixed-path removal also reaps an uploaded-but-never-
        // confirmed orphan; idempotent when nothing is there.
        await removeReceiptObject(getSupabaseAdmin(), receiptObjectPath(user.id, id));

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[Receipt DELETE] Failed:", error);
        return NextResponse.json({ error: "Failed to remove receipt" }, { status: 500 });
    }
}
