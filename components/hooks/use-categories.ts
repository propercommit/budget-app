"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getCategories, createCategory as apiCreate, updateCategory as apiUpdate, deleteCategory as apiDelete } from "@/lib/api";
import { Category } from "@/lib/types";
import { showErrorToast } from "@/lib/toast";

/**
 * Prefers the rejection's user-facing message (e.g. the friendly
 * duplicate-label 409) over a generic fallback. fetchAPI normalizes transport
 * failures, so every Error message that reaches here is displayable.
 */
const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.length > 0 ? error.message : fallback;

export function useCategories(initialCategories?: Category[]) {
  
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? []);
  const [isLoading, setIsLoading] = useState(!initialCategories);
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  // Fetch on mount
  useEffect(() => {
    if (initialCategories) return;
    async function load() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCategory = useCallback(async (
    name: string, icon: string, color: string
  ): Promise<Category | null> => {
    const optimistic: Category = {
      id: `temp-${crypto.randomUUID()}`,
      label: name,
      icon,
      color,
    };

    setCategories(prev => [...prev, optimistic]);

    try {
      const real = await apiCreate({ label: name, icon, color });
      setCategories(prev => prev.map(c => c.id === optimistic.id ? real : c));
      return real;
    } catch (error) {
      // The popin is already closed, so the toast names what failed and
      // offers to replay the exact call (which re-runs the optimistic flow).
      showErrorToast(errorMessage(error, `Couldn't save "${name}"`), { retry: () => { void createCategory(name, icon, color); } });
      console.error("Error creating category:", error);
      setCategories(prev => prev.filter(c => c.id !== optimistic.id));
      return null;
    }
  }, []);

  /** Optimistic update; resolves `true` on success, `false` after a rollback. */
  const updateCategory = useCallback(async (
    id: string, name: string, icon: string, color: string
  ): Promise<boolean> => {
    const original = categoriesRef.current.find(c => c.id === id);
    if (original === undefined) return false;

    const optimistic = { ...original, label: name, icon, color };
    setCategories(prev => prev.map(c => c.id === id ? optimistic : c));

    try {
      await apiUpdate(id, { label: name, icon, color });
      return true;
    } catch (error) {
      showErrorToast(errorMessage(error, `Couldn't save "${name}"`), { retry: () => { void updateCategory(id, name, icon, color); } });
      console.error("Error updating category:", error);
      setCategories(prev => prev.map(c => c.id === id ? original : c));
      return false;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    const original = categoriesRef.current.find(c => c.id === id);
    if (original === undefined) return false;

    setCategories(prev => prev.filter(c => c.id !== id));

    try {
      await apiDelete(id);
      return true;
    } catch (error) {
      showErrorToast(errorMessage(error, `Couldn't delete "${original.label}"`), { retry: () => { void deleteCategory(id); } });
      console.error("Error deleting category:", error);
      setCategories(prev => [...prev, original]);
      return false;
    }
  }, []);

    return {
        categories,
        isLoading,
        addCategory: createCategory,
        updateCategory,
        deleteCategory,
    };
}