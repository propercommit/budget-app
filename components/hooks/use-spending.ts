"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSpending, createSpending as apiCreateSpending, updateSpending as apiUpdateSpending, deleteSpending as apiDeleteSpending, createEntry as apiCreateEntry, updateEntry as apiUpdateEntry, deleteEntry as apiDeleteEntry } from "@/lib/api";
import { SpendingItem } from "@/lib/types";
import { applyEntry, unapplyEntry } from "@/lib/spending/math";
import toast from "react-hot-toast";

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
      data: Parameters<typeof apiCreateSpending>[0],
      category?: { id: string; label: string; icon: string; color: string }
  ): Promise<SpendingItem | null> => {
      const optimistic: SpendingItem = {
        id: `temp-${crypto.randomUUID()}`,
        name: data.name,
        icon: data.icon,
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
      toast.error("Failed to create spending item");
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
      toast.error("Failed to update spending item");
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
      toast.error("Failed to delete spending item");
      console.error("Error deleting spending:", error);
      updateMonth(month, items => [...items, original]);
      return false;
    }
  }, []);

  const copySpendingToMonth = useCallback(async (
    fromMonth: string,
    toMonth: string
  ): Promise<void> => {
    const sourceItems = dataRef.current[fromMonth];
    if (!sourceItems?.length) return;

    try {
      const newItems = await Promise.all(
        sourceItems.map(item =>
          apiCreateSpending({
            name: item.name,
            icon: item.icon,
            categoryId: item.categoryId,
            month: toMonth,
            startDate: `${toMonth}-01`,
          })
        )
      );
      setSpendingData(prev => ({ ...prev, [toMonth]: newItems }));
    } catch (error) {
      console.error("Failed to copy spending:", error);
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
      toast.error("Failed to create entry");
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
      toast.error("Failed to update entry");
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
      toast.error("Failed to delete entry");
      console.error("Error deleting entry:", error);
      updateMonth(month, items => items.map(s =>
        s.id === spendingItemId
          ? { ...s, spent: applyEntry(s.spent, original), entries: [...(s.entries || []), original] }
          : s
      ));
    }
  }, []);

  return {
    spendingData,
    isLoading,
    createSpending,
    updateSpending,
    deleteSpending,
    copySpendingToMonth,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}