"use client"
import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { MonthPicker } from "@/components/month-picker";
import { StickyBudgetBar } from "@/components/sticky-budget-bar";
import { LoadingSpinner } from "@/components/loading-spinner";
import { IncomeCard } from "@/components/income/income-card";
import { IncomePopin } from "@/components/income/popins/income-edit-popin";
import { IncomeDetailPopin } from "@/components/income/popins/income-detail-popin";
import { BudgetOverviewCard } from "@/components/budget-overview/budget-overview";
import { SpendingCard } from "@/components/spending/spending-card";
import { SpendingCarousel } from "@/components/spending/spending-carousel";
import { SpendingItemEditPopin } from "@/components/spending/popins/spending-item-edit-popin";
import { CategoryRibbon } from "@/components/category/category-ribbon";
import { CategoryPopin } from "@/components/category/popins/category-popin";
import { TrendsCard } from "@/components/trends/trends-card";
import {
  createCategory, createEntry, createSpending,
  deleteCategory, deleteEntry, deleteSpending,
  getCategories, getSpending,
  updateCategory, updateEntry, updateSpending,
  getIncomeSources, createIncomeSource, updateIncomeSource, deleteIncomeSource,
  getAllIncomeSources
} from "@/lib/api";
import { Category, SpendingItem, IncomeSource } from "@/lib/types";
import { SectionCard } from "@/components/section-card";
import toast from "react-hot-toast";

type SpendingData = Record<string, SpendingItem[]>;

export default function Home() {
  // =====================
  // State
  // =====================
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [categories, setCategories] = useState<Category[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingData>({});
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);

  // Spending Popin
  const [isSpendingPopinOpen, setIsSpendingPopinOpen] = useState(false);
  const [editingSpendingItem, setEditingSpendingItem] = useState<SpendingItem | null>(null);
  const [spendingPopinKey, setSpendingPopinKey] = useState(0);

  // Category Popin
  const [isCategoryPopinOpen, setIsCategoryPopinOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryPopinKey, setCategoryPopinKey] = useState(0);

  // Income Popins
  const [isIncomePopinOpen, setIsIncomePopinOpen] = useState(false);
  const [editingIncomeSource, setEditingIncomeSource] = useState<IncomeSource | null>(null);
  const [isIncomeDetailOpen, setIsIncomeDetailOpen] = useState(false);
  const [viewingIncomeSource, setViewingIncomeSource] = useState<IncomeSource | null>(null);
  const [allIncomeSources, setAllIncomeSources] = useState<IncomeSource[]>([]);

  const [lastCreatedCategoryName, setLastCreatedCategoryName] = useState<string | null>(null);

  // =====================
  // Data Loading
  // =====================
  useEffect(() => {
      async function loadAllData() {
        try {
          const [categoriesData, spendingDataResult, incomeSourcesData, allIncomeData] = await Promise.all([
            getCategories(),
            getSpending(),
            getIncomeSources(selectedMonth),
            getAllIncomeSources(),
          ]);
          setCategories(categoriesData);
          setSpendingData(spendingDataResult);
          setIncomeSources(incomeSourcesData);
          setAllIncomeSources(allIncomeData);

        } catch (error) {
          console.error("Failed to load data:", error);
        } finally {
          setIsLoading(false);
        }
      }
      loadAllData();
    }, []);

  // =====================
  // Derived Values
  // =====================
  const currentSpendingItems = spendingData[selectedMonth] || [];
  const filteredSpendingItems = selectedCategory === "all"
    ? currentSpendingItems
    : currentSpendingItems.filter(item => item.category?.label === selectedCategory);
  const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);

  const historicalData = Object.entries(spendingData)
    .filter(([month]) => month <= selectedMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, spending]) => ({ month, spending }));

    const incomeByMonth = historicalData.map(monthData => {
      const monthIncome = allIncomeSources
        .filter(source => source.month === monthData.month)
        .reduce((sum, source) => sum + source.amount, 0);

      const date = new Date(monthData.month + "-01");
      return {
        label: date.toLocaleDateString("en-US", { month: "short" }),
        value: monthIncome,
      };
    });

  // =====================
  // Income Handlers
  // =====================
  const handleOpenAddIncome = () => {
    setEditingIncomeSource(null);
    setIsIncomePopinOpen(true);
  };

  const handleSelectIncome = (id: string) => {
    const income = incomeSources.find(i => i.id === id);
    if (income) {
      setViewingIncomeSource(income);
      setIsIncomeDetailOpen(true);
    }
  };

  const handleEditFromDetail = () => {
    setIsIncomeDetailOpen(false);
    if (viewingIncomeSource) {
      setEditingIncomeSource(viewingIncomeSource);
      setTimeout(() => setIsIncomePopinOpen(true), 0);
    }
  };

  const handleSaveIncome = async (data: Omit<IncomeSource, 'id' | 'month'>) => {
    if (editingIncomeSource) {
      // --- EDIT PATH ---
      const optimistic: IncomeSource = {
        ...editingIncomeSource,
        name: data.name,
        amount: data.amount,
        icon: data.icon,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        note: data.note,
      };

      // 1. Update state immediately
      setIncomeSources(prev =>
        prev.map(i => i.id === editingIncomeSource.id ? optimistic : i)
      );

      // 2. Close modal
      setIsIncomePopinOpen(false);
      setEditingIncomeSource(null);

      // 3. API call
      try {
        const updated = await updateIncomeSource(editingIncomeSource.id, {
          name: data.name,
          amount: data.amount,
          icon: data.icon,
          type: data.type,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate?.toISOString(),
          note: data.note,
        });
        setIncomeSources(prev =>
          prev.map(i => i.id === editingIncomeSource.id ? updated : i)
        );
        const refreshed = await getAllIncomeSources();
        setAllIncomeSources(refreshed);
      } catch (error) {
        toast.error('Error updating income source');
        console.error('Error saving income:', error);
        // rollback
        setIncomeSources(prev =>
          prev.map(i => i.id === editingIncomeSource.id ? editingIncomeSource : i)
        );
      }

    } else {
      // --- CREATE PATH ---
      const optimisticIncome: IncomeSource = {
        id: `temp-${crypto.randomUUID()}`,
        name: data.name,
        amount: data.amount,
        icon: data.icon,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        note: data.note,
        month: selectedMonth,
      };

      // 1. Update state immediately
      setIncomeSources(prev => [...prev, optimisticIncome]);

      // 2. Close modal
      setIsIncomePopinOpen(false);
      setEditingIncomeSource(null);

      // 3. API call — swap temp for real
      try {
        const created = await createIncomeSource({
          name: data.name,
          amount: data.amount,
          icon: data.icon,
          type: data.type,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate?.toISOString(),
          note: data.note,
          month: selectedMonth,
        });
        setIncomeSources(prev =>
          prev.map(i => i.id === optimisticIncome.id ? created : i)
        );
        const refreshed = await getAllIncomeSources();
        setAllIncomeSources(refreshed);
      } catch (error) {
        toast.error('Error creating income source');
        console.error('Error saving income:', error);
        // rollback
        setIncomeSources(prev =>
          prev.filter(i => i.id !== optimisticIncome.id)
        );
      }
    }
  };

  const handleDeleteIncome = async () => {
    if (!editingIncomeSource) return;

    const original = editingIncomeSource;

    // Update state
    setIncomeSources(prev => prev.filter(i => i.id !== original.id));
    setAllIncomeSources(prev => prev.filter(i => i.id !== original.id));

    // Close modal
    setIsIncomePopinOpen(false);
    setEditingIncomeSource(null);

    try {
      await deleteIncomeSource(original.id);
    } catch (error) {
      toast.error('Error deleting income source');
      console.error('Error deleting income:', error);
      // rollback
      setIncomeSources(prev => [...prev, original]);
      setAllIncomeSources(prev => [...prev, original]);
    }
  };

  // =====================
  // Month Handlers
  // =====================
  const handleMonthChange = async (newMonth: string) => {
    setSelectedMonth(newMonth);

    // Handle spending
    if (!spendingData[newMonth]) {
      const sortedMonths = Object.keys(spendingData).sort();
      const previousMonths = sortedMonths.filter(m => m < newMonth);

      if (previousMonths.length > 0) {
        const closestMonth = previousMonths[previousMonths.length - 1];
        const previousData = spendingData[closestMonth];

      try {
        const newItems = await Promise.all(
            previousData.map(item =>
              createSpending({
                name: item.name,
                icon: item.icon,
                categoryId: item.categoryId,
                month: newMonth,
                startDate: `${newMonth}-01`,
              })
            )
          );
          setSpendingData(data => ({ ...data, [newMonth]: newItems }));
        } catch (error) {
          console.error('Failed to copy spending:', error);
        }
      }
    }

    // Handle income
    try {
      const newMonthIncome = await getIncomeSources(newMonth);

      if (newMonthIncome.length === 0 && incomeSources.length > 0) {
        const copiedIncome = await Promise.all(
          incomeSources.map(source =>
            createIncomeSource({
              name: source.name,
              amount: source.amount,
              icon: source.icon,
              type: source.type,
              startDate: typeof source.startDate === 'string' ? source.startDate : source.startDate.toISOString(),
              endDate: source.endDate
                ? (typeof source.endDate === 'string' ? source.endDate : source.endDate.toISOString())
                : undefined,
              note: source.note ?? undefined,
              month: newMonth,
            })
          )
        );
        setIncomeSources(copiedIncome);
      } else {
        setIncomeSources(newMonthIncome);
      }

      const refreshed = await getAllIncomeSources();
      setAllIncomeSources(refreshed);
    } catch (error) {
      console.error('Failed to handle income for new month:', error);
    }
  };

  // =====================
  // Spending Handlers
  // =====================
  const handleOpenCreateSpending = () => {
    setEditingSpendingItem(null);
    setSpendingPopinKey(prev => prev + 1);
    setIsSpendingPopinOpen(true);
  };

  const handleDeleteSpending = async (id: string) => {
    
    const originalItem = currentSpendingItems.find(item => item.id === id);

    // optimistic update
    setSpendingData(prev => ({
      ...prev,
      [selectedMonth]: prev[selectedMonth].filter(item => item.id !== id)
    }));

    try {
      await deleteSpending(id);
    } catch (error) {
      toast.error('Error deleting spending item');
      console.error('Error deleting spending:', error);
      // rollback
      if (originalItem) {
        setSpendingData(prev => ({
          ...prev,
          [selectedMonth]: [...(prev[selectedMonth] || []), originalItem]
        }));
      }
    }
  };

  // =====================
  // Category Handlers
  // =====================
  const handleAddCategory = async (name: string, icon: string, color: string) => {
    return await createCategory({ label: name, icon, color });
  };

  const handleEditCategory = async (id: string, name: string, icon: string, color: string) => {
    return await updateCategory(id, { label: name, icon, color });
  };

  const handleDeleteCategory = async (id: string) => {
    const originalCategory = categories.find(c => c.id === id);

    // optimistic update
    setCategories(prev => prev.filter(c => c.id !== id));

    // reset selected category if we're deleting the active filter
    if (originalCategory && selectedCategory === originalCategory.label) {
      setSelectedCategory("all");
    }

    try {
      await deleteCategory(id);
    } catch (error) {
      toast.error('Error deleting category');
      console.error('Error deleting category:', error);
      // rollback
      if (originalCategory) {
        setCategories(prev => [...prev, originalCategory]);
        // restore selected category if it was reset
        if (selectedCategory === "all" && originalCategory.label) {
          setSelectedCategory(originalCategory.label);
        }
      }
    }
  };

  // =====================
  // Entry Handlers
  // =====================
  const handleAddEntry = async (
  spendingItemId: string,
  entry: { name: string; amount: number; receiptUrl?: string; link?: string; date?: string }
  ) => {
    return await createEntry({
      spendingItemId,
      name: entry.name,
      amount: entry.amount,
      receiptUrl: entry.receiptUrl,
      link: entry.link,
      date: entry.date,
    });
  };

  const handleUpdateEntry = async (
    spendingItemId: string,
    entryId: string,
    updatedData: { name?: string; amount?: number; receiptUrl?: string; link?: string; date?: string }
  ) => {
    return await updateEntry(entryId, updatedData);
  };

  const handleDeleteEntry = async (spendingItemId: string, entryId: string) => {
    return await deleteEntry(entryId);
  };

  // =====================
  // Render
  // =====================
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-28 sm:pb-24">
      <Header
        title="Budget Planner"
        legendLabel="Take control of your finances with smart insights and personalized advice"
      />

      <div className="mb-4">
        <MonthPicker
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
        />
      </div>

      {/* Income */}
      <IncomeCard
        incomes={incomeSources}
        onAdd={handleOpenAddIncome}
        onSelect={handleSelectIncome}
      />

      {/* Spending Section */}
      <SectionCard className="mt-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>Spending</p>
          <div className="flex items-center gap-2">
            <p className="text-xs tabular-nums" style={{ color: "#6E6E73" }}>
              {filteredSpendingItems.length} item{filteredSpendingItems.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={handleOpenCreateSpending}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
              style={{ backgroundColor: "#34C759" }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <CategoryRibbon
            categories={categories.map(c => ({ name: c.label, icon: c.icon, color: c.color }))}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            onAddCategory={() => {
              setEditingCategory(null);
              setCategoryPopinKey(prev => prev + 1);
              setIsCategoryPopinOpen(true);
            }}
          />
        </div>

    <SpendingCarousel key={selectedCategory} itemCount={filteredSpendingItems.length} onAdd={handleOpenCreateSpending}>
      {filteredSpendingItems.map((item) => (
        <div key={item.id} className="w-full flex-shrink-0 snap-center">
          <SpendingCard
            spendingName={item.name}
            spendingItemIcon={item.icon}
            categoryName={item.category?.label ?? "Uncategorized"}
            spendingCategoryColor={item.category?.color ?? "#6E6E73"}
            budgetNumber={item.budgeted}
            startDate={item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : ""}
            endDate={item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : undefined}
            note={item.note ?? undefined}
            entries={(item.entries || []).map((e) => ({
              id: e.id,
              name: e.name,
              date: new Date(e.date).toISOString().split("T")[0],
              amount: e.amount,
              receipt: e.receiptUrl ?? null,
              link: e.link ?? null,
            }))}
            categories={categories.map((c) => ({
              name: c.label,
              icon: c.icon,
              color: c.color,
            }))}
            onItemUpdate={async (data) => {
              const cat = categories.find((c) => c.label === data.category);
              if (!cat) return;

              const optimistic = {
                ...item,
                name: data.name,
                icon: data.icon,
                categoryId: cat.id,
                category: cat,
                budgeted: data.budget,
                startDate: data.startDate,
                endDate: data.endDate || null,
                note: data.note || null,
              };

              // optimistic update
              setSpendingData(prev => ({
                ...prev,
                [selectedMonth]: prev[selectedMonth].map(s =>
                  s.id === item.id ? optimistic : s
                )
              }));

              try {
                const realSpending = await updateSpending(item.id, {
                  name: data.name,
                  icon: data.icon,
                  categoryId: cat.id,
                  budgeted: data.budget,
                  startDate: data.startDate,
                  endDate: data.endDate || null,
                  note: data.note || null,
                });
                setSpendingData(prev => ({
                  ...prev,
                  [selectedMonth]: prev[selectedMonth].map(s =>
                    s.id === item.id ? realSpending : s
                  )
                }));
              } catch (error) {
                toast.error('Error updating spending item');
                console.error("Error updating spending item:", error);
                // rollback
                setSpendingData(prev => ({
                  ...prev,
                  [selectedMonth]: prev[selectedMonth].map(s =>
                    s.id === item.id ? item : s
                  )
                }));
              }
            }}
            onItemDelete={() => handleDeleteSpending(item.id)}
            onEntryCreate={async (data) => {
              
              const optimisticEntry = {
                id: `temp-${crypto.randomUUID()}`,
                name: data.name,
                amount: data.amount,
                date: data.date,
                receiptUrl: data.receipt ?? null,
                link: data.link ?? null,
                spendingItemId: item.id,
              };

              // optimistic update — add entry + update spent
              setSpendingData(prev => ({
                ...prev,
                [selectedMonth]: prev[selectedMonth].map(s =>
                  s.id === item.id
                    ? {
                        ...s,
                        spent: s.spent + data.amount,
                        entries: [...(s.entries || []), optimisticEntry],
                      }
                    : s
                )
              }));

              try {
                const realEntry = await handleAddEntry(item.id, {
                  name: data.name,
                  amount: data.amount,
                  date: data.date,
                  receiptUrl: data.receipt ?? undefined,
                  link: data.link ?? undefined,
                });

                setSpendingData(prev => ({
                  ...prev,
                  [selectedMonth]: prev[selectedMonth].map(s =>
                    s.id === item.id
                      ? {
                          ...s,
                          entries: (s.entries || []).map(e =>
                            e.id === optimisticEntry.id ? realEntry : e
                          ),
                        }
                      : s
                  )
                }));
              } catch (error) {
                toast.error('Error creating entry:');
                console.error("Error creating entry:", error);
                // rollback
                setSpendingData(prev => ({
                  ...prev,
                  [selectedMonth]: prev[selectedMonth].map(s =>
                    s.id === item.id 
                      ? {
                          ...s,
                          spent: s.spent - data.amount,
                          entries: (s.entries || []).filter(e => e.id !== optimisticEntry.id),
                        }
                      : s
                  )
                }));
              }
            }}
            onEntryUpdate={async (entryId, data) => {
              const originalEntry = item.entries?.find(e => e.id === entryId);
              const amountDiff = data.amount - (originalEntry?.amount ?? 0);

              // optimistic update
              setSpendingData(prev => ({
                ...prev,
                [selectedMonth]: prev[selectedMonth].map(s =>
                  s.id === item.id
                    ? {
                        ...s,
                        spent: s.spent + amountDiff,
                        entries: (s.entries || []).map(e =>
                          e.id === entryId
                            ? { ...e, name: data.name, amount: data.amount, date: data.date, receiptUrl: data.receipt ?? null, link: data.link ?? null }
                            : e
                        ),
                      }
                    : s
                )
              }));

              try {
                await handleUpdateEntry(item.id, entryId, {
                  name: data.name,
                  amount: data.amount,
                  date: data.date,
                  receiptUrl: data.receipt ?? undefined,
                  link: data.link ?? undefined,
                });
              } catch (error) {
                toast.error('Error updating entry');
                console.error("Error updating entry:", error);
                // rollback
                setSpendingData(prev => ({
                  ...prev,
                  [selectedMonth]: prev[selectedMonth].map(s =>
                    s.id === item.id
                      ? {
                          ...s,
                          spent: s.spent - amountDiff,
                          entries: (s.entries || []).map(e =>
                            e.id === entryId && originalEntry ? originalEntry : e
                          ),
                        }
                      : s
                  )
                }));
              }
            }}
            onEntryDelete={async (entryId) => {
              const originalEntry = item.entries?.find(e => e.id === entryId);

              // optimistic update — remove entry + update spent
              setSpendingData(prev => ({
                ...prev,
                [selectedMonth]: prev[selectedMonth].map(s =>
                  s.id === item.id
                    ? {
                        ...s,
                        spent: s.spent - (originalEntry?.amount ?? 0),
                        entries: (s.entries || []).filter(e => e.id !== entryId),
                      }
                    : s
                )
              }));

              try {
                await handleDeleteEntry(item.id, entryId);
              } catch (error) {
                toast.error('Error deleting entry');
                console.error("Error deleting entry:", error);
                // rollback — restore entry
                if (originalEntry) {
                  setSpendingData(prev => ({
                    ...prev,
                    [selectedMonth]: prev[selectedMonth].map(s =>
                      s.id === item.id
                        ? {
                            ...s,
                            spent: s.spent + originalEntry.amount,
                            entries: [...(s.entries || []), originalEntry],
                          }
                        : s
                    )
                  }));
                }
              }
            }}
            onCreateCategory={async (data) => {
              await handleAddCategory(data.name, data.icon, data.color);
            }}
          />
        </div>
      ))}
    </SpendingCarousel>
      </SectionCard>

      {/* Insights */}
      <div className="mt-6 space-y-4">
        <TrendsCard
          spendingData={historicalData.map(monthData => {
            const date = new Date(monthData.month + "-01");
            return {
              label: date.toLocaleDateString("en-US", { month: "short" }),
              value: monthData.spending.reduce((sum, item) => sum + item.spent, 0),
            };
          })}
          incomeData={incomeByMonth}
          categoryData={Object.fromEntries(
            categories
              .map(cat => [
                cat.label,
                historicalData.map(monthData => {
                  const date = new Date(monthData.month + "-01");
                  return {
                    label: date.toLocaleDateString("en-US", { month: "short" }),
                    value: monthData.spending
                      .filter(item => item.category?.label === cat.label)
                      .reduce((sum, item) => sum + item.spent, 0),
                  };
                }),
              ])
              .filter(([, data]) => (data as { label: string; value: number }[]).some(d => d.value > 0))
          )}
          categories={categories.map(c => ({ name: c.label, icon: c.icon, color: c.color }))}
        />

        <BudgetOverviewCard
          totalIncome={totalIncome}
          categories={categories}
          spendingItems={currentSpendingItems}
        />
      </div>

      {/* Popins */}
      <SpendingItemEditPopin
        autoSelectCategory={lastCreatedCategoryName}
        key={editingSpendingItem?.id ?? `create-spending-${spendingPopinKey}`}
        isOpen={isSpendingPopinOpen}
        onClose={() => {
          setIsSpendingPopinOpen(false);
          setEditingSpendingItem(null);
          setLastCreatedCategoryName(null);
        }}
        onSave={async (data) => {
          const category = categories.find(c => c.label === data.category);
          if (!category) return;

          // case spending item edit
          if (editingSpendingItem) {
            const optimisticSpending = {
              ...editingSpendingItem,
              name: data.name,
              icon: data.icon,
              categoryId: category.id,
              category: category,
              budgeted: data.budget,
              startDate: data.startDate,
              endDate: data.endDate || null,
              note: data.note || null,
            };

            // update state immediately
            setSpendingData(prev => ({
              ...prev,
              [selectedMonth]: prev[selectedMonth].map(item =>
                item.id === editingSpendingItem.id ? optimisticSpending : item
              )
            }));

            setIsSpendingPopinOpen(false);
            setEditingSpendingItem(null);

            // update db
            try {
              const realSpending = await updateSpending(editingSpendingItem.id, {
                name: data.name,
                icon: data.icon,
                categoryId: category.id,
                budgeted: data.budget,
                startDate: data.startDate,
                endDate: data.endDate || null,
                note: data.note || null,
              });
              setSpendingData(prev => ({
                ...prev,
                [selectedMonth]: prev[selectedMonth].map(item =>
                  item.id === editingSpendingItem.id ? realSpending : item
                )
              }));
            } catch (error) {
              toast.error('error updating spending item');
              console.log('error updating spending item:', error);
              // rollback — restore the original item
              setSpendingData(prev => ({
                ...prev,
                [selectedMonth]: prev[selectedMonth].map(item =>
                  item.id === editingSpendingItem.id ? editingSpendingItem : item
                )
              }));
            }
          } else {

            const optimisticSpending: SpendingItem = {
              id: `temp-${crypto.randomUUID()}`,
              name: data.name,
              icon: data.icon,
              categoryId: category.id,
              month: selectedMonth,
              budgeted: data.budget,
              startDate: data.startDate,
              endDate: data.endDate || null,
              note: data.note || null,
              spent: 0,
              category: category,
              entries: []
            };

            // update state
            setSpendingData(prev => ({
              ...prev,
              [selectedMonth]: [...(prev[selectedMonth] || []), optimisticSpending]
            }));

            setIsSpendingPopinOpen(false);
            setEditingSpendingItem(null);

            // update db
            try {
              const realSpending = await createSpending({
                name: data.name,
                icon: data.icon,
                categoryId: category.id,
                month: selectedMonth,
                budgeted: data.budget,
                startDate: data.startDate,
                endDate: data.endDate || null,
                note: data.note || null,
              });
              setSpendingData(prev => ({
              ...prev,
              [selectedMonth]: prev[selectedMonth].map(item =>
                item.id === optimisticSpending.id ? realSpending : item
              )
            }));
            } catch (error) {
              toast.error('an error occurred trying to create spending item');
              console.log('error occurred trying to create spending item :', error);
                setSpendingData(prev => ({
                ...prev,
                [selectedMonth]: prev[selectedMonth].filter(item => item.id !== optimisticSpending.id)
              }));
            }
          }
        }}
        onDelete={editingSpendingItem ? async () => {
          await handleDeleteSpending(editingSpendingItem.id);
          setIsSpendingPopinOpen(false);
          setEditingSpendingItem(null);
        } : undefined}
        onCreateCategory={() => {
          setEditingCategory(null);
          setCategoryPopinKey(prev => prev + 1);
          setIsCategoryPopinOpen(true);
        }}
        mode={editingSpendingItem ? "edit" : "create"}
        categories={categories.map(c => ({ name: c.label, icon: c.icon, color: c.color }))}
        initialName={editingSpendingItem?.name ?? ""}
        initialIcon={editingSpendingItem?.icon ?? ""}
        initialCategory={editingSpendingItem?.category?.label ?? ""}
        initialBudget={editingSpendingItem?.budgeted ?? 0}
        initialStartDate={editingSpendingItem?.startDate ? new Date(editingSpendingItem.startDate).toISOString().split("T")[0] : ""}
        initialEndDate={editingSpendingItem?.endDate ? new Date(editingSpendingItem.endDate).toISOString().split("T")[0] : undefined}
        initialNote={editingSpendingItem?.note ?? ""}
      />

      <CategoryPopin
        key={editingCategory?.id ?? `create-category-${categoryPopinKey}`}
        isOpen={isCategoryPopinOpen}
        onClose={() => {
          setIsCategoryPopinOpen(false);
          setEditingCategory(null);
        }}
        onSave={async (data: { name: string; icon: string; color: string }) => {
          if (editingCategory) {
            // --- EDIT PATH ---
            const optimistic = {
              ...editingCategory,
              label: data.name,
              icon: data.icon,
              color: data.color,
            };

            // 1. Update state immediately
            setCategories(prev =>
              prev.map(c => c.id === editingCategory.id ? optimistic : c)
            );

            // 2. Close modal
            setIsCategoryPopinOpen(false);
            setEditingCategory(null);

            // 3. API call + rollback
            try {
              await handleEditCategory(editingCategory.id, data.name, data.icon, data.color);
            } catch (error) {
              toast.error("Error updating category");
              console.log('error updating category: ', error);
              // Rollback — put the original back
              setCategories(prev =>
                prev.map(c => c.id === editingCategory.id ? editingCategory : c)
              );
            }

          } else {
            // --- CREATE PATH ---
            const optimisticCategory: Category = {
              id: `temp-${crypto.randomUUID()}`,
              label: data.name,
              icon: data.icon,
              color: data.color,
            };

            // 1. Update state immediately
            setCategories(prev => [...prev, optimisticCategory]);
            setLastCreatedCategoryName(data.name);

            // 2. Close modal
            setIsCategoryPopinOpen(false);
            setEditingCategory(null);

            // 3. API call — swap temp for real
            try {
              const realCategory = await handleAddCategory(data.name, data.icon, data.color);
              if (realCategory) {
                setCategories(prev =>
                  prev.map(c => c.id === optimisticCategory.id ? realCategory : c)
                );
              }
            } catch (error) {
              toast.error("Error creating category");
              console.log('error creating category: ', error);
              // Rollback — remove the optimistic one
              setCategories(prev =>
                prev.filter(c => c.id !== optimisticCategory.id)
              );
            }
          }
        }}
        onDelete={editingCategory ? async () => {
          await handleDeleteCategory(editingCategory.id);
          setIsCategoryPopinOpen(false);
          setEditingCategory(null);
        } : undefined}
        mode={editingCategory ? "edit" : "create"}
        initialName={editingCategory?.label ?? ""}
        initialIcon={editingCategory?.icon ?? "shopping-cart"}
        initialColor={editingCategory?.color ?? "#007AFF"}
      />

      <IncomePopin
        key={editingIncomeSource?.id ?? 'add'}
        isOpen={isIncomePopinOpen}
        onClose={() => {
          setIsIncomePopinOpen(false);
          setEditingIncomeSource(null);
        }}
        onSave={handleSaveIncome}
        onDelete={handleDeleteIncome}
        mode={editingIncomeSource ? 'edit' : 'add'}
        initialData={editingIncomeSource}
      />

      <IncomeDetailPopin
        isOpen={isIncomeDetailOpen}
        onClose={() => {
          setIsIncomeDetailOpen(false);
          setViewingIncomeSource(null);
        }}
        onEdit={handleEditFromDetail}
        income={viewingIncomeSource}
      />

      <StickyBudgetBar
        totalIncome={totalIncome}
        totalBudgeted={currentSpendingItems.reduce((sum, item) => sum + item.budgeted, 0)}
        totalSpent={currentSpendingItems.reduce((sum, item) => sum + item.spent, 0)}
      />
    </div>
  );
}