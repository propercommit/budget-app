"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSpending, createSpending as apiCreateSpending, updateSpending as apiUpdateSpending, deleteSpending as apiDeleteSpending, materializeMonth as apiMaterializeMonth, createEntry as apiCreateEntry, updateEntry as apiUpdateEntry, deleteEntry as apiDeleteEntry, type CreateSeriesPayload } from "@/lib/api";
import { Category, SpendingEntry, SpendingItem } from "@/lib/types";
import { applyEntry, unapplyEntry } from "@/lib/spending/math";
import { showErrorToast } from "@/lib/toast";
import toast from "react-hot-toast";

type SpendingData = Record<string, SpendingItem[]>;

/**
 * The structured 409s the create endpoint answers when the requested name
 * already belongs to a series (D24). The popin maps these to inline form
 * states; they are never surfaced as raw error toasts.
 */
export type CreateSpendingConflict = "series_dormant" | "series_active_this_month";

function isCreateSpendingConflict(message: string): message is CreateSpendingConflict {
  return message === "series_dormant" || message === "series_active_this_month";
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

// Month names deliberately match MonthPicker's hardcoded en-US labels.
function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function useSpending(initialSpendingData?: SpendingData) {
  const [spendingData, setSpendingData] = useState<SpendingData>(initialSpendingData ?? {});
  const [isLoading, setIsLoading] = useState(!initialSpendingData);
  const dataRef = useRef(spendingData);
  dataRef.current = spendingData;

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

      if (Array.isArray(items)) setSpendingData(prev => ({ ...prev, [month]: items }));
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
    data: { name: string; amount: number; date: string; direction?: "debit" | "credit"; receiptUrl?: string; link?: string }
  ): Promise<void> => {
    const optimistic = {
      id: `temp-${crypto.randomUUID()}`,
      name: data.name,
      amount: data.amount,
      direction: data.direction ?? "debit",
      date: data.date,
      receiptUrl: data.receiptUrl ?? null,
      link: data.link ?? null,
      spendingItemId,
    };

    updateMonth(month, items => items.map(s =>
      s.id === spendingItemId
        ? { ...s, spent: applyEntry(s.spent, optimistic), entries: [...(s.entries || []), optimistic] }
        : s
    ));

    try {
      const real = await apiCreateEntry({ spendingItemId, ...data });

      // A cross-month date routed the entry to another month's incarnation:
      // replacing the source item below also undoes the optimistic patch.
      if (isRoutedResult(real)) {
        syncRoutedMonths(real);
        return;
      }

      updateMonth(month, items => items.map(s =>
        s.id === spendingItemId
          ? { ...s, entries: (s.entries || []).map(e => e.id === optimistic.id ? real : e) }
          : s
      ));
    } catch (error) {
      showErrorToast(`Couldn't save "${data.name}"`, { retry: () => { void createEntry(month, spendingItemId, data); } });
      console.error("Error creating entry:", error);
      updateMonth(month, items => items.map(s =>
        s.id === spendingItemId
          ? { ...s, spent: unapplyEntry(s.spent, optimistic), entries: (s.entries || []).filter(e => e.id !== optimistic.id) }
          : s
      ));
    }
  }, [syncRoutedMonths]);

  const updateEntry = useCallback(async (
    month: string,
    spendingItemId: string,
    entryId: string,
    data: { name: string; amount: number; date: string; direction?: "debit" | "credit"; receiptUrl?: string; link?: string }
  ): Promise<void> => {
    const item = dataRef.current[month]?.find(s => s.id === spendingItemId);
    const original = item?.entries?.find(e => e.id === entryId);

    if (original === undefined) return;

    // A form that doesn't expose direction keeps the entry's stored one.
    const updated = {
      ...original,
      name: data.name,
      amount: data.amount,
      direction: data.direction ?? original.direction,
      date: data.date,
      receiptUrl: data.receiptUrl ?? null,
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
      const real = await apiUpdateEntry(entryId, data);

      // The new date moved the entry to another month (D19): the server
      // recomputed both incarnations; replacing the source item also undoes
      // the optimistic in-place patch above.
      if (isRoutedResult(real)) syncRoutedMonths(real);
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
  }, [syncRoutedMonths]);

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

  const updateAllMonths = useCallback((fn: (items: SpendingItem[]) => SpendingItem[]) => {
    setSpendingData(prev => Object.fromEntries(Object.entries(prev).map(([month, items]) => [month, fn(items)])));
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
    removeItemsByCategory,
    updateCategoryOnItems,
  };
}