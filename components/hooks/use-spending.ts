"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSpending, createSpending as apiCreateSpending, updateSpending as apiUpdateSpending, deleteSpending as apiDeleteSpending, materializeMonth as apiMaterializeMonth, createEntry as apiCreateEntry, updateEntry as apiUpdateEntry, deleteEntry as apiDeleteEntry, type CreateSeriesPayload } from "@/lib/api";
import { Category, SpendingItem } from "@/lib/types";
import { applyEntry, unapplyEntry } from "@/lib/spending/math";
import { showErrorToast } from "@/lib/toast";

type SpendingData = Record<string, SpendingItem[]>;

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
      data: CreateSeriesPayload,
      category?: { id: string; label: string; icon: string; color: string }
  ): Promise<SpendingItem | null> => {
      const optimistic: SpendingItem = {
        id: `temp-${crypto.randomUUID()}`,
        seriesId: `temp-series-${crypto.randomUUID()}`,
        name: data.name,
        icon: data.icon,
        recurring: data.recurring ?? true,
        categoryId: data.categoryId,
        month,
        budgeted: data.budgeted ?? 0,
        startDate: data.startDate ?? `${month}-01`,
        endDate: data.endDate ?? null,
        note: data.note ?? null,
        spent: 0,
        category: category ?? undefined,
        entries: [],
      };

    updateMonth(month, items => [...items, optimistic]);

    try {
      const real = await apiCreateSpending(data);
      updateMonth(month, items => items.map(s => s.id === optimistic.id ? real : s));
      return real;
    } catch (error) {
      // The popin is already closed, so the toast names what failed and
      // offers to replay the exact call (which re-runs the optimistic flow).
      showErrorToast(`Couldn't save "${data.name}"`, { retry: () => { void createSpending(month, data, category); } });
      console.error("Error creating spending:", error);
      updateMonth(month, items => items.filter(s => s.id !== optimistic.id));
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
  }, []);

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
      await apiUpdateEntry(entryId, data);
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
  }, []);

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