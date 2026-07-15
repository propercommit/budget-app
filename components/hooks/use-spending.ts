"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSpending, createSpending as apiCreateSpending, updateSpending as apiUpdateSpending, deleteSpending as apiDeleteSpending, materializeMonth as apiMaterializeMonth, createEntry as apiCreateEntry, updateEntry as apiUpdateEntry, deleteEntry as apiDeleteEntry, issueReceiptUpload as apiIssueReceiptUpload, confirmReceipt as apiConfirmReceipt, deleteReceipt as apiDeleteReceipt, type CreateSeriesPayload } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { Category, SpendingEntry, SpendingItem } from "@/lib/types";
import { applyEntry, unapplyEntry } from "@/lib/spending/math";
import { monthLabel } from "@/lib/spending/month";
import { uploadReceiptFile } from "@/lib/upload-receipt";
import { type ReceiptAction } from "@/lib/receipt-file";
import { showErrorToast } from "@/lib/toast";
import toast from "react-hot-toast";

/**
 * How long a locally-confirmed receipt patch outranks server responses.
 * Covers the window where a materializeMonth response minted BEFORE the
 * confirm landed would otherwise wholesale-replace the month bucket and
 * revert the patch; evicted early as soon as a server payload agrees.
 */
const RECEIPT_PATCH_TTL_MS = 30_000;

type SpendingData = Record<string, SpendingItem[]>;

/**
 * The structured 409s the create endpoint answers when the requested name
 * already belongs to a series (D24). The popin maps these to inline form
 * states; they are never surfaced as raw error toasts.
 */
export type CreateSpendingConflict = "series_dormant" | "series_not_in_month" | "series_active_this_month";

function isCreateSpendingConflict(message: string): message is CreateSpendingConflict {
  return message === "series_dormant" || message === "series_not_in_month" || message === "series_active_this_month";
}

/**
 * What the entries endpoints return when an entry's date routed it to another
 * month's incarnation (D19): the addressed/source item and the target item,
 * both fresh from the server with recomputed `spent`.
 */
type RoutedEntryResult = {
  entry: SpendingEntry;
  sourceItem: SpendingItem;
  targetItem: SpendingItem;
};

function isRoutedResult(value: unknown): value is RoutedEntryResult {
  return typeof value === "object" && value !== null && "targetItem" in value;
}

export function useSpending(initialSpendingData?: SpendingData) {
  const [spendingData, setSpendingData] = useState<SpendingData>(initialSpendingData ?? {});
  const [isLoading, setIsLoading] = useState(!initialSpendingData);
  const dataRef = useRef(spendingData);
  dataRef.current = spendingData;

  // Entry ids with a receipt chain in flight — kept OUTSIDE spendingData so
  // materializeMonth's wholesale bucket replacement can't wipe the indicator.
  const [receiptUploads, setReceiptUploads] = useState<Record<string, "uploading">>({});

  // Receipt values confirmed (or removed) locally, merged over every
  // materializeMonth response until the server catches up — see
  // RECEIPT_PATCH_TTL_MS. Maps entry id → receiptPath (null = removed).
  const confirmedReceiptPatches = useRef<Map<string, string | null>>(new Map());

  // Eviction timers per entry — a newer patch must cancel the older timer,
  // or a confirm followed by a remove within the TTL gets evicted early.
  const receiptPatchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (initialSpendingData) return;
    async function load() {
      try {
        setSpendingData(await getSpending());
      } catch (error) {
        console.error("Failed to load spending:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Helper — update items for a specific month
  const updateMonth = (month: string, fn: (items: SpendingItem[]) => SpendingItem[]) => {
    setSpendingData(prev => ({ ...prev, [month]: fn(prev[month] || []) }));
  };

  const updateAllMonths = useCallback((fn: (items: SpendingItem[]) => SpendingItem[]) => {
    setSpendingData(prev => Object.fromEntries(Object.entries(prev).map(([month, items]) => [month, fn(items)])));
  }, []);

  // =====================
  // Receipts
  // =====================

  /**
   * Patches an entry's receiptPath by id across ALL loaded months — never by
   * (month, itemId) address, which goes stale when a mid-upload date edit
   * routes the entry to another month (the id survives moves). Also records
   * the value in `confirmedReceiptPatches` so a stale materializeMonth
   * response can't revert it.
   */
  const setEntryReceiptEverywhere = useCallback((entryId: string, receiptPath: string | null) => {
    confirmedReceiptPatches.current.set(entryId, receiptPath);

    const previousTimer = receiptPatchTimers.current.get(entryId);

    if (previousTimer !== undefined) clearTimeout(previousTimer);

    receiptPatchTimers.current.set(entryId, setTimeout(() => {
      confirmedReceiptPatches.current.delete(entryId);
      receiptPatchTimers.current.delete(entryId);
    }, RECEIPT_PATCH_TTL_MS));

    updateAllMonths(items => items.map(s => ({
      ...s,
      entries: (s.entries || []).map(e => e.id === entryId ? { ...e, receiptPath } : e),
    })));
  }, [updateAllMonths]);

  /**
   * The full upload chain, entry-id-first: issue token → direct-to-Storage
   * upload → authoritative confirm → patch local state. Never optimistic (a
   * receipt is only real once the server confirmed it) and never rolls back
   * the entry — the entry save already succeeded before this runs.
   *
   * Failure mapping: quota/type/size codes are terminal (specific toast, no
   * retry — the same file would fail again); a confirm 404 means the user
   * deleted the entry mid-upload (silent); everything else — network, 500,
   * token expiry, and 409 receipt_not_uploaded — retries by replaying the
   * WHOLE chain (a bare confirm retry would 409 forever, since the object
   * genuinely isn't there).
   */
  const uploadReceipt = useCallback(async (entryId: string, file: File, entryName: string): Promise<void> => {
    setReceiptUploads(prev => ({ ...prev, [entryId]: "uploading" }));

    try {
      const { path, token } = await apiIssueReceiptUpload(entryId, { sizeBytes: file.size });

      await uploadReceiptFile(path, token, file);

      const { receiptPath } = await apiConfirmReceipt(entryId);

      setEntryReceiptEverywhere(entryId, receiptPath);
    } catch (error) {
      console.error("Error uploading receipt:", error);

      const code = error instanceof ApiError ? error.message : null;

      if (code === "quota_exceeded") toast.error("Receipt storage is full (50 MB). Delete some receipts first.");
      else if (code === "unsupported_type") toast.error("That file isn't a supported image.");
      else if (code === "receipt_too_large") toast.error("Receipts can be at most 10 MB.");
      else if (code !== "Entry not found") showErrorToast(`Couldn't attach the receipt to "${entryName}"`, { retry: () => { void uploadReceipt(entryId, file, entryName); } });
    } finally {
      setReceiptUploads(prev => {
        const next = { ...prev };

        delete next[entryId];

        return next;
      });
    }
  }, [setEntryReceiptEverywhere]);

  /**
   * Removes an entry's receipt: optimistic null patch, DELETE on the receipt
   * route, rollback + toast on failure — the standard optimistic contract.
   * This chain (not an omitted JSON key) is what makes removal persist.
   */
  const removeReceipt = useCallback(async (entryId: string, entryName: string): Promise<void> => {
    let originalPath: string | null = null;

    for (const items of Object.values(dataRef.current)) {
      const found = items.flatMap(s => s.entries || []).find(e => e.id === entryId);

      if (found !== undefined) {
        originalPath = found.receiptPath;
        break;
      }
    }

    setEntryReceiptEverywhere(entryId, null);

    try {
      await apiDeleteReceipt(entryId);
    } catch (error) {
      console.error("Error removing receipt:", error);
      setEntryReceiptEverywhere(entryId, originalPath);
      showErrorToast(`Couldn't remove the receipt from "${entryName}"`, { retry: () => { void removeReceipt(entryId, entryName); } });
    }
  }, [setEntryReceiptEverywhere]);

  // =====================
  // Spending Item CRUD
  // =====================
  const createSpending = useCallback(async (
      month: string,
      data: CreateSeriesPayload & { seriesId?: string },
      category?: { id: string; label: string; icon: string; color: string }
  ): Promise<SpendingItem | CreateSpendingConflict | null> => {
      const optimistic: SpendingItem = {
        id: `temp-${crypto.randomUUID()}`,
        seriesId: data.seriesId ?? `temp-series-${crypto.randomUUID()}`,
        name: data.name,
        icon: data.icon,
        recurring: data.recurring ?? true,
        categoryId: data.categoryId,
        month,
        budgeted: data.budgeted ?? 0,
        note: data.note ?? null,
        spent: 0,
        category: category ?? undefined,
        entries: [],
      };

    updateMonth(month, items => [...items, optimistic]);

    try {
      // A known seriesId means an explicit Resume (D24) — the attach shape;
      // otherwise the full shape creates the series with its first incarnation.
      const real = await apiCreateSpending(
        data.seriesId !== undefined
          ? { seriesId: data.seriesId, month: data.month, recurring: data.recurring, budgeted: data.budgeted, note: data.note }
          : data
      );

      updateMonth(month, items => items.map(s => s.id === optimistic.id ? real : s));
      return real;
    } catch (error) {
      updateMonth(month, items => items.filter(s => s.id !== optimistic.id));

      // Structured 409s are the typeahead's server-side safety net — the
      // caller maps them to form states, so no toast here.
      if (error instanceof Error && isCreateSpendingConflict(error.message)) return error.message;

      // The popin is already closed, so the toast names what failed and
      // offers to replay the exact call (which re-runs the optimistic flow).
      showErrorToast(`Couldn't save "${data.name}"`, { retry: () => { void createSpending(month, data, category); } });
      console.error("Error creating spending:", error);
      return null;
    }
  }, []);

  const updateSpending = useCallback(async (
    month: string,
    id: string,
    data: Parameters<typeof apiUpdateSpending>[1],
    optimisticItem: SpendingItem
  ): Promise<void> => {
    const original = dataRef.current[month]?.find(s => s.id === id);
    if (!original) return;

    updateMonth(month, items => items.map(s => s.id === id ? optimisticItem : s));

    try {
      const real = await apiUpdateSpending(id, data);
      updateMonth(month, items => items.map(s => s.id === id ? real : s));
    } catch (error) {
      showErrorToast(`Couldn't save "${optimisticItem.name}"`, { retry: () => { void updateSpending(month, id, data, optimisticItem); } });
      console.error("Error updating spending:", error);
      updateMonth(month, items => items.map(s => s.id === id ? original : s));
    }
  }, []);

  const deleteSpending = useCallback(async (month: string, id: string): Promise<boolean> => {
    const original = dataRef.current[month]?.find(s => s.id === id);
    if (!original) return false;

    updateMonth(month, items => items.filter(s => s.id !== id));

    try {
      await apiDeleteSpending(id);
      return true;
    } catch (error) {
      showErrorToast(`Couldn't delete "${original.name}"`, { retry: () => { void deleteSpending(month, id); } });
      console.error("Error deleting spending:", error);
      updateMonth(month, items => [...items, original]);
      return false;
    }
  }, []);

  /**
   * Lazy materialization (D22): asks the server to give every active
   * recurring series an incarnation in `month`, then syncs the returned
   * bucket wholesale. Idempotent server-side, so it runs on every month
   * open — including months that already have items (a partially populated
   * month still receives the rest of the template).
   *
   * Failure is logged and leaves local state untouched: the month simply
   * renders whatever was already loaded, and the next navigation retries.
   */
  const materializeMonth = useCallback(async (month: string): Promise<void> => {
    try {
      const items: SpendingItem[] = await apiMaterializeMonth(month);

      if (Array.isArray(items)) {
        // A response minted before an in-flight receipt confirm landed would
        // silently revert the confirmed patch on wholesale replacement —
        // locally-confirmed receipt values win until the server agrees.
        const patches = confirmedReceiptPatches.current;

        const merged = items.map(item => ({
          ...item,
          entries: (item.entries || []).map(e => {
            const patched = patches.get(e.id);

            if (patched === undefined) return e;

            if (e.receiptPath === patched) {
              patches.delete(e.id);

              return e;
            }

            return { ...e, receiptPath: patched };
          }),
        }));

        setSpendingData(prev => ({ ...prev, [month]: merged }));
      }
    } catch (error) {
      console.error("Failed to materialize month:", error);
    }
  }, []);

  // =====================
  // Entry CRUD
  // =====================

  /**
   * Applies a cross-month routing result: the source item is replaced with
   * the server's copy (which also rolls back any optimistic patch on it) and
   * the target item is updated or inserted — its month bucket may not exist
   * locally yet. Ends with the `Moved to {Month}` toast.
   */
  const syncRoutedMonths = useCallback(({ sourceItem, targetItem }: RoutedEntryResult) => {
    setSpendingData(prev => {
      const next = { ...prev };

      next[sourceItem.month] = (next[sourceItem.month] || []).map(s => s.id === sourceItem.id ? sourceItem : s);

      const targetBucket = next[targetItem.month] || [];

      next[targetItem.month] = targetBucket.some(s => s.id === targetItem.id)
        ? targetBucket.map(s => s.id === targetItem.id ? targetItem : s)
        : [...targetBucket, targetItem];

      return next;
    });

    toast.success(`Moved to ${monthLabel(targetItem.month)}`);
  }, []);

  const createEntry = useCallback(async (
    month: string,
    spendingItemId: string,
    data: { name: string; amount: number; date: string; direction?: "debit" | "credit"; link?: string; receipt?: ReceiptAction }
  ): Promise<void> => {
    // The receipt never rides the entry payload: it needs a persisted entry
    // id (the fixed Storage path is keyed on it), so the chain starts only
    // after the POST returns — and the optimistic temp entry has no receipt.
    const { receipt, ...fields } = data;

    const optimistic = {
      id: `temp-${crypto.randomUUID()}`,
      name: data.name,
      amount: data.amount,
      direction: data.direction ?? "debit",
      date: data.date,
      receiptPath: null,
      link: data.link ?? null,
      spendingItemId,
    };

    updateMonth(month, items => items.map(s =>
      s.id === spendingItemId
        ? { ...s, spent: applyEntry(s.spent, optimistic), entries: [...(s.entries || []), optimistic] }
        : s
    ));

    try {
      const real = await apiCreateEntry({ spendingItemId, ...fields });

      // A cross-month date routed the entry to another month's incarnation:
      // replacing the source item below also undoes the optimistic patch.
      if (isRoutedResult(real)) syncRoutedMonths(real);
      else updateMonth(month, items => items.map(s =>
        s.id === spendingItemId
          ? { ...s, entries: (s.entries || []).map(e => e.id === optimistic.id ? real : e) }
          : s
      ));

      const realId = isRoutedResult(real) ? real.entry.id : real.id;

      // Fire-and-forget: the entry save already succeeded, and the chain
      // owns its own failure toasts.
      if (receipt !== undefined && receipt.action === "attach") void uploadReceipt(realId, receipt.file, data.name);
    } catch (error) {
      showErrorToast(`Couldn't save "${data.name}"`, { retry: () => { void createEntry(month, spendingItemId, data); } });
      console.error("Error creating entry:", error);
      updateMonth(month, items => items.map(s =>
        s.id === spendingItemId
          ? { ...s, spent: unapplyEntry(s.spent, optimistic), entries: (s.entries || []).filter(e => e.id !== optimistic.id) }
          : s
      ));
    }
  }, [syncRoutedMonths, uploadReceipt]);

  const updateEntry = useCallback(async (
    month: string,
    spendingItemId: string,
    entryId: string,
    data: { name: string; amount: number; date: string; direction?: "debit" | "credit"; link?: string; receipt?: ReceiptAction }
  ): Promise<void> => {
    const item = dataRef.current[month]?.find(s => s.id === spendingItemId);
    const original = item?.entries?.find(e => e.id === entryId);

    if (original === undefined) return;

    const { receipt, ...fields } = data;

    // A form that doesn't expose direction keeps the entry's stored one. The
    // receipt is untouched here: remove/attach run as their own chains after
    // the PUT succeeds, and each owns its optimistic state and rollback.
    const updated = {
      ...original,
      name: data.name,
      amount: data.amount,
      direction: data.direction ?? original.direction,
      date: data.date,
      link: data.link ?? null,
    };

    updateMonth(month, items => items.map(s =>
      s.id === spendingItemId
        ? {
            ...s,
            spent: applyEntry(unapplyEntry(s.spent, original), updated),
            entries: (s.entries || []).map(e => e.id === entryId ? updated : e),
          }
        : s
    ));

    try {
      const real = await apiUpdateEntry(entryId, fields);

      // The new date moved the entry to another month (D19): the server
      // recomputed both incarnations; replacing the source item also undoes
      // the optimistic in-place patch above.
      if (isRoutedResult(real)) syncRoutedMonths(real);

      // Receipt actions run only after the entry PUT succeeded — a failed
      // PUT skips them entirely (one toast per action).
      if (receipt !== undefined && receipt.action === "remove") await removeReceipt(entryId, data.name);

      if (receipt !== undefined && receipt.action === "attach") void uploadReceipt(entryId, receipt.file, data.name);
    } catch (error) {
      showErrorToast(`Couldn't save "${data.name}"`, { retry: () => { void updateEntry(month, spendingItemId, entryId, data); } });
      console.error("Error updating entry:", error);
      updateMonth(month, items => items.map(s =>
        s.id === spendingItemId
          ? {
              ...s,
              // Exact inverse of the optimistic step: remove `updated`, restore `original`.
              spent: applyEntry(unapplyEntry(s.spent, updated), original),
              entries: (s.entries || []).map(e => e.id === entryId ? original : e),
            }
          : s
      ));
    }
  }, [syncRoutedMonths, removeReceipt, uploadReceipt]);

  const deleteEntry = useCallback(async (
    month: string,
    spendingItemId: string,
    entryId: string
  ): Promise<void> => {
    const item = dataRef.current[month]?.find(s => s.id === spendingItemId);
    const original = item?.entries?.find(e => e.id === entryId);

    if (original === undefined) return;

    updateMonth(month, items => items.map(s =>
      s.id === spendingItemId
        ? {
            ...s,
            // Removing a credit raises spent — unapplyEntry handles both signs.
            spent: unapplyEntry(s.spent, original),
            entries: (s.entries || []).filter(e => e.id !== entryId),
          }
        : s
    ));

    try {
      await apiDeleteEntry(entryId);
    } catch (error) {
      showErrorToast(`Couldn't delete "${original.name}"`, { retry: () => { void deleteEntry(month, spendingItemId, entryId); } });
      console.error("Error deleting entry:", error);
      updateMonth(month, items => items.map(s =>
        s.id === spendingItemId
          ? { ...s, spent: applyEntry(s.spent, original), entries: [...(s.entries || []), original] }
          : s
      ));
    }
  }, []);

  /**
   * Mirrors a category cascade delete in client state: drops the category's
   * spending items (and with them their entries) across ALL loaded months.
   * Pure local filter — the server rows are already gone via the DB cascade.
   */
  const removeItemsByCategory = useCallback((categoryId: string) => {
    updateAllMonths(items => items.filter(i => i.categoryId !== categoryId));
  }, [updateAllMonths]);

  /**
   * Mirrors a category edit in client state: refreshes the category snapshot
   * embedded on every loaded spending item of that category. Cards, the label
   * filter and trends read the embedded copy, not the categories list, so a
   * rename/recolor would otherwise render stale until a full reload.
   */
  const updateCategoryOnItems = useCallback((category: Category) => {
    updateAllMonths(items => items.map(i => i.categoryId === category.id ? { ...i, category } : i));
  }, [updateAllMonths]);

  return {
    spendingData,
    isLoading,
    createSpending,
    updateSpending,
    deleteSpending,
    materializeMonth,
    createEntry,
    updateEntry,
    deleteEntry,
    receiptUploads,
    setEntryReceiptEverywhere,
    removeItemsByCategory,
    updateCategoryOnItems,
  };
}