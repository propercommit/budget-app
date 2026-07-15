"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getReceiptUrl } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { RECEIPT_SIGNED_URL_TTL_SECONDS } from "@/lib/receipt-storage";

/** Refresh this long before a cached URL's real expiry, not at it. */
const EXPIRY_MARGIN_MS = 60_000;

type CachedUrl = { url: string; expiresAt: number };

export type ReceiptUrlStatus = "idle" | "loading" | "ready" | "error";

type UrlState = { url: string | null; status: ReceiptUrlStatus };

function isFresh(cached: CachedUrl | undefined): cached is CachedUrl {
    return cached !== undefined && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now();
}

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
 *
 * Synchronous state transitions happen during render via the
 * adjust-state-when-props-change pattern (repo precedent: the detail popin's
 * pager); the effect performs only the async fetch.
 */
export function useReceiptUrl(
    entryId: string | null,
    receiptPath: string | null | undefined,
    onReceiptGone?: (entryId: string) => void,
): { url: string | null; status: ReceiptUrlStatus; retry: () => void; markBroken: () => void; getFreshUrl: () => Promise<string | null> } {

    // A stable mutable container, not a ref: entries are read during render
    // (the cached-state derivation) and mutated from handlers/async code; the
    // Map identity itself never changes.
    const [cache] = useState(() => new Map<string, CachedUrl>());
    const [refreshNonce, setRefreshNonce] = useState(0);

    // The gone-callback is intentionally not a fetch-effect dependency — a
    // parent re-render must not refetch. Synced post-render (latest-ref).
    const onGoneRef = useRef(onReceiptGone);

    const subject = entryId !== null && entryId.startsWith("temp-") === false
        && receiptPath !== null && receiptPath !== undefined
        ? entryId
        : null;

    // Latest subject, for getFreshUrl's staleness guard: a fetch started for
    // entry A must not clobber display state after the user paged to entry B.
    const subjectRef = useRef(subject);

    useEffect(() => {
        onGoneRef.current = onReceiptGone;
        subjectRef.current = subject;
    });

    const stateFor = (id: string | null): UrlState => {
        if (id === null) return { url: null, status: "idle" };

        const cached = cache.get(id);

        if (isFresh(cached)) return { url: cached.url, status: "ready" };

        return { url: null, status: "loading" };
    };

    const [state, setState] = useState<UrlState>(() => stateFor(subject));
    const [prevSubject, setPrevSubject] = useState(subject);

    // Render-phase adjustment: entering/leaving an entry resets the display
    // state synchronously, without an extra effect-driven render pass.
    if (prevSubject !== subject) {
        setPrevSubject(subject);
        setState(stateFor(subject));
    }

    useEffect(() => {
        if (subject === null) return;

        if (isFresh(cache.get(subject))) return;

        let cancelled = false;

        getReceiptUrl(subject)
            .then(({ url }) => {
                cache.set(subject, { url, expiresAt: Date.now() + RECEIPT_SIGNED_URL_TTL_SECONDS * 1000 });

                if (cancelled === false) setState({ url, status: "ready" });
            })
            .catch((error: unknown) => {
                if (cancelled) return;

                const code = error instanceof ApiError ? error.message : null;

                if (code === "no_receipt" || code === "Entry not found") {
                    setState({ url: null, status: "idle" });
                    onGoneRef.current?.(subject);
                    return;
                }

                console.error("Failed to load receipt URL:", error);
                setState({ url: null, status: "error" });
            });

        return () => { cancelled = true; };
    }, [subject, refreshNonce]);

    const retry = useCallback(() => {
        if (entryId !== null) cache.delete(entryId);

        setState({ url: null, status: "loading" });
        setRefreshNonce(n => n + 1);
    }, [entryId, cache]);

    const markBroken = useCallback(() => {
        if (entryId !== null) cache.delete(entryId);

        setState({ url: null, status: "error" });
    }, [entryId, cache]);

    const getFreshUrl = useCallback(async (): Promise<string | null> => {
        if (subject === null) return null;

        const cached = cache.get(subject);

        if (isFresh(cached)) return cached.url;

        try {
            const { url } = await getReceiptUrl(subject);

            cache.set(subject, { url, expiresAt: Date.now() + RECEIPT_SIGNED_URL_TTL_SECONDS * 1000 });

            // The user may have paged to another entry while this resolved —
            // the cache write above is subject-keyed and safe, but display
            // state belongs to whatever entry is current now.
            if (subjectRef.current === subject) setState({ url, status: "ready" });

            return url;
        } catch (error) {
            const code = error instanceof ApiError ? error.message : null;

            // Same contract as the fetch effect: a gone receipt is a state,
            // not an error — clear the block instead of a silent dead tap.
            if (code === "no_receipt" || code === "Entry not found") {
                if (subjectRef.current === subject) setState({ url: null, status: "idle" });

                onGoneRef.current?.(subject);

                return null;
            }

            console.error("Failed to refresh receipt URL:", error);
            return null;
        }
    }, [subject, cache]);

    return { url: state.url, status: state.status, retry, markBroken, getFreshUrl };
}
