"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCategories,
  createCategory as apiCreate,
  updateCategory as apiUpdate,
  deleteCategory as apiDelete,
} from "@/lib/api";
import { Category } from "@/lib/types";
import toast from "react-hot-toast";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  // Fetch on mount
  useEffect(() => {
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
      toast.error("Failed to create category");
      console.error("Error creating category:", error);
      setCategories(prev => prev.filter(c => c.id !== optimistic.id));
      return null;
    }
  }, []);

  const updateCategory = useCallback(async (
    id: string, name: string, icon: string, color: string
  ): Promise<void> => {
    const original = categoriesRef.current.find(c => c.id === id);
    if (!original) return;

    const optimistic = { ...original, label: name, icon, color };
    setCategories(prev => prev.map(c => c.id === id ? optimistic : c));

    try {
      await apiUpdate(id, { label: name, icon, color });
    } catch (error) {
      toast.error("Failed to update category");
      console.error("Error updating category:", error);
      setCategories(prev => prev.map(c => c.id === id ? original : c));
    }
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    const original = categoriesRef.current.find(c => c.id === id);
    if (!original) return false;

    setCategories(prev => prev.filter(c => c.id !== id));

    try {
      await apiDelete(id);
      return true;
    } catch (error) {
      toast.error("Failed to delete category");
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