"use client"
import { Header } from "@/components/header";
import { MonthPicker } from "@/components/month-picker";
import { GraphToggleBtn } from "@/components/graph-toggle-button";
import { useState } from "react";
import { SpendingTrendsCard } from "@/components/spending-trends-card";
import { SpendingCardPopin } from "@/components/spending-card-popin";
import { CategoryPopin } from "@/components/category-creation-popin";
import { StickyBudgetBar } from "@/components/sticky-budget-bar";
import { createCategory, createEntry, createSpending, deleteCategory, deleteEntry, deleteSpending, getCategories, getSpending, updateCategory, updateEntry, updateSpending, getIncomeSources, createIncomeSource, updateIncomeSource, deleteIncomeSource } from "@/lib/api";
import { useEffect } from "react";
import { Category, SpendingItem, IncomeSource } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";
import { IncomeCard } from "@/components/income/income-card";
import { IncomePopin } from "@/components/income/popins/income-edit-popin";
import { IncomeDetailPopin } from "@/components/income/popins/income-detail-popin";
import { BudgetOverviewCard } from "@/components/budget-overview/budget-overview";
import { SpendingCard } from "@/components/spending/spending-card";
import { SpendingItemDetailPopin } from "@/components/spending/popins/spending-item-detail-popin";
import { SpendingItemEditPopin } from "@/components/spending/popins/spending-item-edit-popin";

type SpendingData = Record<string, SpendingItem[]>;

export default function Home() {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  
  // Spending Popin State
  const [isSpendingPopinOpen, setIsSpendingPopinOpen] = useState(false);
  const [editingSpendingItem, setEditingSpendingItem] = useState<SpendingItem | null>(null);
  const [spendingPopinKey, setSpendingPopinKey] = useState(0);
  
  // Category Popin State
  const [isCategoryPopinOpen, setIsCategoryPopinOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingData>({});

  // Income State
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);

  // Income Popin State
  const [isIncomePopinOpen, setIsIncomePopinOpen] = useState(false);
  const [editingIncomeSource, setEditingIncomeSource] = useState<IncomeSource | null>(null);

  // Income Detail Popin State
  const [isIncomeDetailOpen, setIsIncomeDetailOpen] = useState(false);
  const [viewingIncomeSource, setViewingIncomeSource] = useState<IncomeSource | null>(null);

// test spending popins
const [showDetail, setShowDetail] = useState(false);
const [showEdit, setShowEdit] = useState(false);


  useEffect(() => {
    async function loadAllData() {
      try {
        const [categoriesData, spendingDataResult, incomeSourcesData] = await Promise.all([
          getCategories(),
          getSpending(),
          getIncomeSources(selectedMonth)
        ]);
        
        setCategories(categoriesData);
        setSpendingData(spendingDataResult);
        setIncomeSources(incomeSourcesData);
      } catch (error) {
        console.error("Failed to load data, error :", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAllData();
  }, []);

  // Derived values
  const currentSpendingItems = spendingData[selectedMonth] || [];
  const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);

  // Spending Popin Handlers
  const handleOpenCreateSpending = () => {
    setEditingSpendingItem(null);
    setSpendingPopinKey(prev => prev + 1);
    setIsSpendingPopinOpen(true);
  };

  const handleOpenEditSpending = (item: SpendingItem) => {
    setEditingSpendingItem(item);
    setIsSpendingPopinOpen(true);
  };

  const handleCloseSpendingPopin = (open: boolean) => {
    setIsSpendingPopinOpen(open);
    if (!open) {
      setEditingSpendingItem(null);
    }
  };

  // Category Popin Handlers
  const handleOpenEditCategory = (category: Category) => {
    console.log('Opening edit for category:', category);
    setEditingCategory(category);
    setIsCategoryPopinOpen(true);
  };

  const handleCloseCategoryPopin = (open: boolean) => {
    setIsCategoryPopinOpen(open);
    if (!open) {
      setEditingCategory(null);
    }
  };

  // Income Popin Handlers
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

  const handleSaveIncome = async (data: Omit<IncomeSource, 'id'>) => {
    try {
      if (editingIncomeSource) {
        // Edit
        const updated = await updateIncomeSource(editingIncomeSource.id, {
          name: data.name,
          amount: data.amount,
          icon: data.icon,
          type: data.type,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate?.toISOString(),
          note: data.note,
        });
        setIncomeSources(prev => prev.map(i => 
          i.id === editingIncomeSource.id ? updated : i
        ));
      } else {
        // Add
        const created = await createIncomeSource({
          name: data.name,
          amount: data.amount,
          icon: data.icon,
          type: data.type,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate?.toISOString(),
          note: data.note,
        });
        setIncomeSources(prev => [...prev, created]);
      }
      setIsIncomePopinOpen(false);
      setEditingIncomeSource(null);
    } catch (error) {
      console.error('Error saving income:', error);
    }
  };

  const handleDeleteIncome = async () => {
    if (editingIncomeSource) {
      try {
        await deleteIncomeSource(editingIncomeSource.id);
        setIncomeSources(prev => prev.filter(i => i.id !== editingIncomeSource.id));
      } catch (error) {
        console.error('Error deleting income:', error);
      }
    }
    setIsIncomePopinOpen(false);
    setEditingIncomeSource(null);
  };

  // Month Handlers
  const handleMonthChange = async (newMonth: string) => {
    setSelectedMonth(newMonth);
    
    // Reload income sources for the new month
    try {
      const incomeSourcesData = await getIncomeSources(newMonth);
      setIncomeSources(incomeSourcesData);
    } catch (error) {
      console.error('Failed to load income sources:', error);
    }
    
    // Handle spending
    if (!spendingData[newMonth]) {
      const sortedMonths = Object.keys(spendingData).sort();
      const previousMonths = sortedMonths.filter(m => m < newMonth);
      
      if (previousMonths.length > 0) {
        const closestMonth = previousMonths[previousMonths.length - 1];
        const previousData = spendingData[closestMonth];

        console.log('Copying spending from', closestMonth);
        console.log('Previous data:', previousData);
        console.log('Number of items to copy:', previousData.length);
        
        try {
          // Create each spending item in the database
          const newItems = await Promise.all(
            previousData.map(item => 
              createSpending({
                name: item.name,
                icon: item.icon,
                categoryId: item.categoryId,
                month: newMonth,
              })
            )
          );
          
          setSpendingData(data => ({
            ...data,
            [newMonth]: newItems
          }));
        } catch (error) {
          console.error('Failed to copy spending:', error);
        }
      }
    }
  };

  // Spending Handlers
  const handleSpendingChange = (id: string, budgeted: number, spent: number) => {
    // update state
    setSpendingData(data => ({
      ...data,
      [selectedMonth]: data[selectedMonth].map(item =>
        item.id === id ? { ...item, budgeted, spent } : item
      ),
    }));
  };

  const handleSpendingCommit = async (id: string, budgeted: number, spent: number) => {
    // update database
    await updateSpending(id, {budgeted, spent});
  };

  const handleAddSpending = async (name: string, categoryId: string, icon: string) => {
    try {
      // query the api
      const spending = await createSpending({name, icon, categoryId, month: selectedMonth});

      // update the state
      setSpendingData(data => ({
        ...data,
        [selectedMonth]:  [...(data[selectedMonth] || []), spending]
      }));

    } catch (error) {
      console.log('Error creating a spending card: ', error);
    }
  }

  const handleEditSpending = async (id: string, name: string, categoryId: string, icon: string) => {
    try {
      console.log('1. Starting edit:', { id, name, categoryId, icon });
      
      const spending = await updateSpending(id, { name, icon, categoryId });
      console.log('2. API response:', spending);

      setSpendingData(data => {
        console.log('3. Current data for month:', data[selectedMonth]);
        return {
          ...data,
          [selectedMonth]: data[selectedMonth].map(item =>
            item.id === id ? spending : item
          )
        };
      });

    } catch (error) {
      console.log('Error editing a spending card', error);
    }
  };

  const handleDeleteSpending = async(id: string) => {
    try {
      // delete in database
      await deleteSpending(id);
      
      // delete in the state
      setSpendingData(data => ({
        ...data,
        [selectedMonth]: data[selectedMonth].filter(item => item.id !== id)
      }));

    } catch (error) {
      console.log('Error trying to delete spending from database : ', error);
    }
  };

  // Category Handlers
  const handleAddCategory = async (name: string, icon: string, color: string) => {
    try {
      const newCategory = await createCategory({ label: name, icon, color });
      setCategories([...categories, newCategory]);
      return newCategory;
    } catch (error) {
      console.error("Failed to create category:", error);
      return undefined;
    }
  };

  const handleEditCategory = async(id: string, name: string, icon: string, color: string) => {
    try {
      // update the database
      await updateCategory(id, {label: name, icon, color});

      // update the state
      setCategories(categories.map(c => 
        c.id === id ? {...c, label: name, icon, color} : c
      ))
    } catch (error) {
      console.log('Error trying to update database : ', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const categoryToDelete = categories.find(c => c.id === id);
      
      await deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      
      if (categoryToDelete && selectedCategory === categoryToDelete.label) {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  // Entry handlers
  const handleAddEntry = async (
    spendingItemId: string,
    entry: { name: string; amount: number; receiptUrl?: string; link?: string, date?: string }
  ) => {
    // Create temporary entry for optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempEntry = {
      id: tempId,
      name: entry.name,
      amount: entry.amount,
      receiptUrl: entry.receiptUrl || null,
      link: entry.link || null,
      date: entry.date || new Date().toISOString(),
      spendingItemId,
    };

    // Save current state for rollback
    const previousData = { ...spendingData };

    // Optimistic update
    setSpendingData(data => ({
      ...data,
      [selectedMonth]: data[selectedMonth].map(item => {
        if (item.id === spendingItemId) {
          const updatedEntries = [...(item.entries || []), tempEntry];
          const newSpent = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
          return { ...item, entries: updatedEntries, spent: newSpent };
        }
        return item;
      })
    }));

    try {
      const newEntry = await createEntry({
        spendingItemId,
        name: entry.name,
        amount: entry.amount,
        receiptUrl: entry.receiptUrl,
        link: entry.link,
        date: entry.date,
      });

      // Replace temp entry with real entry from server
      setSpendingData(data => ({
        ...data,
        [selectedMonth]: data[selectedMonth].map(item => {
          if (item.id === spendingItemId) {
            const updatedEntries = (item.entries || []).map(e =>
              e.id === tempId ? newEntry : e
            );
            return { ...item, entries: updatedEntries };
          }
          return item;
        })
      }));
    } catch (error) {
      console.error('Error adding entry:', error);
      setSpendingData(previousData);
    }
  };

  const handleUpdateEntry = async (
    spendingItemId: string,
    entryId: string,
    updatedData: { name?: string; amount?: number; receiptUrl?: string; link?: string, date?: string }
  ) => {
    // Save current state for rollback
    const previousData = { ...spendingData };

    // Optimistic update - update UI immediately
    setSpendingData(data => ({
      ...data,
      [selectedMonth]: data[selectedMonth].map(item => {
        if (item.id === spendingItemId) {
          const updatedEntries = (item.entries || []).map(e =>
            e.id === entryId ? { ...e, ...updatedData } : e
          );
          const newSpent = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
          return { ...item, entries: updatedEntries, spent: newSpent };
        }
        return item;
      })
    }));

    // Then sync with database
    try {
      await updateEntry(entryId, updatedData);
    } catch (error) {
      console.error('Error updating entry:', error);
      // Revert to previous state on error
      setSpendingData(previousData);
    }
  };

  const handleDeleteEntry = async (spendingItemId: string, entryId: string) => {
    // Save current state for rollback
    const previousData = { ...spendingData };

    // Optimistic update
    setSpendingData(data => ({
      ...data,
      [selectedMonth]: data[selectedMonth].map(item => {
        if (item.id === spendingItemId) {
          const updatedEntries = (item.entries || []).filter(e => e.id !== entryId);
          const newSpent = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
          return { ...item, entries: updatedEntries, spent: newSpent };
        }
        return item;
      })
    }));

    try {
      await deleteEntry(entryId);
    } catch (error) {
      console.error('Error deleting entry:', error);
      setSpendingData(previousData);
    }
  };

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
      
      {/* Month picker and trends button - stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <MonthPicker 
          selectedMonth={selectedMonth} 
          onMonthChange={handleMonthChange} 
        />
        <GraphToggleBtn 
          label="trends"
          isActive={showTrends}
          onToggle={() => setShowTrends(!showTrends)}
        />
      </div>

      {showTrends && (
        <SpendingTrendsCard
          historicalData={Object.entries(spendingData)
            .filter(([month]) => month <= selectedMonth)
            .map(([month, spending]) => ({
              month,
              spending,
            }))}
          incomeData={[]}
          categories={categories}
          onClose={() => setShowTrends(false)}
        />
      )}

      <IncomeCard 
        incomes={incomeSources}
        onAdd={handleOpenAddIncome}
        onSelect={handleSelectIncome}
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

      <div data-spending-section>
<SpendingCard
    spendingName="Fuel"
    spendingItemIcon="⛽"
    categoryName="Transport"
    spendingCategoryColor="#FF9500"
    budgetNumber={900}
    entries={[
        { id: "1", name: "Shell Station", date: "2026-02-04", amount: 45.00 },
        { id: "2", name: "BP Highway", date: "2026-02-02", amount: 62.50 },
        { id: "3", name: "Total Gas", date: "2026-01-28", amount: 38.00 },
    ]}
    onItemDetailClick={() => console.log("detail clicked")}
    onEntryClick={(entry) => console.log("entry clicked:", entry.name)}
    onAddEntry={() => console.log("add entry")}
/>
<button
    onClick={() => setShowDetail(true)}
    className="px-4 py-2 bg-blue-500 text-white rounded-xl"
>
    Test Detail Popin
</button>
<button
    onClick={() => setShowEdit(true)}
    className="px-4 py-2 bg-green-500 text-white rounded-xl ml-2"
>
    Test Edit Popin
</button>

<SpendingItemDetailPopin
    isOpen={showDetail}
    onClose={() => setShowDetail(false)}
    onEdit={() => { setShowDetail(false); setShowEdit(true); }}
    spendingName="Fuel"
    spendingItemIcon="⛽"
    categoryName="Transport"
    spendingCategoryColor="#FF9500"
    budgetNumber={900}
    totalSpent={200}
    entriesCount={4}
    startDate="2024-01-01"
    note="Monthly fuel budget for commuting to work."
/>

<SpendingItemEditPopin
    isOpen={showEdit}
    onClose={() => setShowEdit(false)}
    onSave={(data) => { console.log("saved:", data); setShowEdit(false); }}
    onDelete={() => { console.log("deleted"); setShowEdit(false); }}
    onCreateCategory={() => console.log("create category")}
    mode="edit"
    categories={[
        { name: "Transport", icon: "🚗", color: "#FF9500" },
        { name: "Entertainment", icon: "🎮", color: "#AF52DE" },
        { name: "Food", icon: "🍽️", color: "#FF3B30" },
    ]}
    initialName="Fuel"
    initialIcon="shopping-cart"
    initialCategory="Transport"
    initialBudget={900}
    initialStartDate="2024-01-01"
    initialNote="Monthly fuel budget for commuting to work."
/>
        {/* <SpendingCategoriesCard
          title="Spending Categories"
          legend="Track budgeted vs actual spending"
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          spendingItems={currentSpendingItems}
          totalIncome={totalIncome}
          onSpendingChange={handleSpendingChange}
          onSpendingCommit={handleSpendingCommit}
          onOpenCreateSpending={handleOpenCreateSpending}
          onEditSpendingItem={handleOpenEditSpending}
          onEditCategory={handleOpenEditCategory}
          onAddEntry={handleAddEntry}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
        /> */}
      </div>

      <SpendingCardPopin
        key={editingSpendingItem?.id ?? `create-${spendingPopinKey}`}
        isOpen={isSpendingPopinOpen}
        onOpenChange={handleCloseSpendingPopin}
        onAddSpending={handleAddSpending}
        onEditSpending={handleEditSpending}
        onDeleteSpending={handleDeleteSpending}
        onAddCategory={handleAddCategory}
        categories={categories}
        mode={editingSpendingItem ? "edit" : "create"}
        editingItem={editingSpendingItem}
      />

      <CategoryPopin
        key={`category-${editingCategory?.label ?? "create"}`}
        isOpen={isCategoryPopinOpen}
        onOpenChange={handleCloseCategoryPopin}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        mode={editingCategory ? "edit" : "create"}
        editingCategory={editingCategory}
      />

      <div data-budget-overview>
        <BudgetOverviewCard 
          totalIncome={totalIncome}
          categories={categories}
          spendingItems={currentSpendingItems}
        />
      </div>

      <StickyBudgetBar
          totalIncome={totalIncome}
          totalBudgeted={currentSpendingItems.reduce((sum, item) => sum + item.budgeted, 0)}
          totalSpent={currentSpendingItems.reduce((sum, item) => sum + item.spent, 0)}
      />
    </div>
  );
}