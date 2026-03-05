"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getIncomeSources, getAllIncomeSources, createIncomeSource as apiCreate, updateIncomeSource as apiUpdate, deleteIncomeSource as apiDelete } from "@/lib/api";
import { IncomeSource } from "@/lib/types";
import toast from "react-hot-toast";

export function useIncome(selectedMonth: string) {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [allIncomeSources, setAllIncomeSources] = useState<IncomeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const incomeRef = useRef(incomeSources);
  incomeRef.current = incomeSources;

  useEffect(() => {
    async function load() {
      try {
        const [monthly, all] = await Promise.all([
          getIncomeSources(selectedMonth),
          getAllIncomeSources(),
        ]);
        setIncomeSources(monthly);
        setAllIncomeSources(all);
      } catch (error) {
        console.error("Failed to load income:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [selectedMonth]);

  const createIncome = useCallback(async (
    month: string,
    data: Omit<IncomeSource, 'id' | 'month'>
  ): Promise<IncomeSource | null> => {
    const optimistic: IncomeSource = {
      id: `temp-${crypto.randomUUID()}`,
      ...data,
      month,
    };

    setIncomeSources(prev => [...prev, optimistic]);

    try {
      const real = await apiCreate({
        name: data.name,
        amount: data.amount,
        icon: data.icon,
        type: data.type,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate?.toISOString(),
        note: data.note,
        month,
      });
      setIncomeSources(prev => prev.map(i => i.id === optimistic.id ? real : i));
      const refreshed = await getAllIncomeSources();
      setAllIncomeSources(refreshed);
      return real;
    } catch (error) {
      toast.error("Failed to create income source");
      console.error("Error creating income:", error);
      setIncomeSources(prev => prev.filter(i => i.id !== optimistic.id));
      return null;
    }
  }, []);

  const updateIncome = useCallback(async (
    id: string,
    data: Omit<IncomeSource, 'id' | 'month'>
  ): Promise<void> => {
    const original = incomeRef.current.find(i => i.id === id);
    if (!original) return;

    const optimistic: IncomeSource = { ...original, ...data };
    setIncomeSources(prev => prev.map(i => i.id === id ? optimistic : i));

    try {
      const updated = await apiUpdate(id, {
        name: data.name,
        amount: data.amount,
        icon: data.icon,
        type: data.type,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate?.toISOString(),
        note: data.note,
      });
      setIncomeSources(prev => prev.map(i => i.id === id ? updated : i));
      const refreshed = await getAllIncomeSources();
      setAllIncomeSources(refreshed);
    } catch (error) {
      toast.error("Failed to update income source");
      console.error("Error updating income:", error);
      setIncomeSources(prev => prev.map(i => i.id === id ? original : i));
    }
  }, []);

  const deleteIncome = useCallback(async (id: string): Promise<boolean> => {
    const original = incomeRef.current.find(i => i.id === id);
    if (!original) return false;

    setIncomeSources(prev => prev.filter(i => i.id !== id));
    setAllIncomeSources(prev => prev.filter(i => i.id !== id));

    try {
      await apiDelete(id);
      return true;
    } catch (error) {
      toast.error("Failed to delete income source");
      console.error("Error deleting income:", error);
      setIncomeSources(prev => [...prev, original]);
      setAllIncomeSources(prev => [...prev, original]);
      return false;
    }
  }, []);

  const loadMonth = useCallback(async (newMonth: string): Promise<void> => {
    try {
      const newMonthIncome = await getIncomeSources(newMonth);

      if (newMonthIncome.length === 0 && incomeRef.current.length > 0) {
        const copied = await Promise.all(
          incomeRef.current.map(source =>
            apiCreate({
              name: source.name,
              amount: source.amount,
              icon: source.icon,
              type: source.type,
              startDate: typeof source.startDate === 'string'
                ? source.startDate
                : source.startDate.toISOString(),
              endDate: source.endDate
                ? (typeof source.endDate === 'string'
                    ? source.endDate
                    : source.endDate.toISOString())
                : undefined,
              note: source.note ?? undefined,
              month: newMonth,
            })
          )
        );
        setIncomeSources(copied);
      } else {
        setIncomeSources(newMonthIncome);
      }

      const refreshed = await getAllIncomeSources();
      setAllIncomeSources(refreshed);
    } catch (error) {
      console.error("Failed to handle income for new month:", error);
    }
  }, []);

  return {
    incomeSources,
    allIncomeSources,
    isLoading,
    createIncome,
    updateIncome,
    deleteIncome,
    loadMonth,
  };
}