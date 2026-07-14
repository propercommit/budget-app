"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getReceiptUrl } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { RECEIPT_SIGNED_URL_TTL_SECONDS } from "@/lib/receipt-storage";

/** Refresh this long before a cached URL's real expiry, not at it. */
const EXPIRY_MARGIN_MS = 60_000;

type CachedUrl = { url: string; expiresAt: number };

export type ReceiptUrlStatus = "idle" | "loading" | "ready" | "error";

/**
 * Fetch-on-open seam for receipt rendering: mints a signed read URL for the
 * entry via GET /api/entries/[id]/receipt when the detail popin shows an
 * entry with a receipt, and caches it per entry id for the hook's lifetime
 * (the popin pages between siblings without refetching). The GET body carries
 * only the URL — expiry is computed locally from the shared TTL constant.
 *
 * Failure semantics:
 * - A 404 `no_receipt`/`Entry not found` is NOT an error — the receipt is
 *   gone (removed on another device, or the local payload is ISR-stale):
 *   `onReceiptGone` lets the owner clear local state so the block disappears.
 * - Anything else (network, 500, an expired URL surfaced via the image's
 *   onError → `markBroken`) becomes the `error` state; `retry` evicts the
 *   cache and refetches, so a fresh mint resolves expiry while a second
 *   storage-404 confirms a dangling pointer.
 *
 * `getFreshUrl` is the interaction-time check: awaited before opening the
 * full-screen viewer and before a download, so a popin left open past the
 * TTL never feeds a dead URL to a brand-new fetch.
 */
export function useReceiptUrl(
    entryId: string | null,
    receiptPath: string | null | undefined,
    onReceiptGone?: (entryId: string) => void,
): { url: string | null; status: ReceiptUrlStatus; retry: () => void; markBroken: () => void; getFreshUrl: () => Promise<string | null> } {

    const cache = useRef<Map<string, CachedUrl>>(new Map());
    const [state, setState] = useState<{ url: string | null; status: ReceiptUrlStatus }>({ url: null, status: "idle" });
    const [refreshNonce, setRefreshNonce] = useState(0);

    // The gone-callback is intentionally not an effect dependency — a parent
    // re-render must not refetch.
    const onGoneRef = useRef(onReceiptGone);
    onGoneRef.current = onReceiptGone;

    const wantsUrl = entryId !== null && entryId.startsWith("temp-") === false
        && receiptPath !== null && receiptPath !== undefined;

    useEffect(() => {
        if (wantsUrl === false || entryId === null) {
            setState({ url: null, status: "idle" });
            return;
        }

        const cached = cache.current.get(entryId);

        if (cached !== undefined && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
            setState({ url: cached.url, status: "ready" });
            return;
        }

        let cancelled = false;

        setState({ url: null, status: "loading" });

        getReceiptUrl(entryId)
            .then(({ url }) => {
                cache.current.set(entryId, { url, expiresAt: Date.now() + RECEIPT_SIGNED_URL_TTL_SECONDS * 1000 });

                if (cancelled === false) setState({ url, status: "ready" });
            })
            .catch((error: unknown) => {
                if (cancelled) return;

                const code = error instanceof ApiError ? error.message : null;

                if (code === "no_receipt" || code === "Entry not found") {
                    setState({ url: null, status: "idle" });
                    onGoneRef.current?.(entryId);
                    return;
                }

                console.error("Failed to load receipt URL:", error);
                setState({ url: null, status: "error" });
            });

        return () => { cancelled = true; };
    }, [entryId, wantsUrl, refreshNonce]);

    const retry = useCallback(() => {
        if (entryId !== null) cache.current.delete(entryId);

        setRefreshNonce(n => n + 1);
    }, [entryId]);

    const markBroken = useCallback(() => {
        if (entryId !== null) cache.current.delete(entryId);

        setState({ url: null, status: "error" });
    }, [entryId]);

    const getFreshUrl = useCallback(async (): Promise<string | null> => {
        if (wantsUrl === false || entryId === null) return null;

        const cached = cache.current.get(entryId);

        if (cached !== undefined && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return cached.url;

        try {
            const { url } = await getReceiptUrl(entryId);

            cache.current.set(entryId, { url, expiresAt: Date.now() + RECEIPT_SIGNED_URL_TTL_SECONDS * 1000 });
            setState({ url, status: "ready" });

            return url;
        } catch (error) {
            console.error("Failed to refresh receipt URL:", error);
            return null;
        }
    }, [entryId, wantsUrl]);

    return { url: state.url, status: state.status, retry, markBroken, getFreshUrl };
}
