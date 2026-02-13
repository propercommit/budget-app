"use client"
import { Header } from "@/components/header";
import { MonthPicker } from "@/components/month-picker";
import { GraphToggleBtn } from "@/components/graph-toggle-button";
import { MonthlyIncomeCard } from "@/components/monthly-income-card";
import { useState } from "react";
import { SpendingCategoriesCard } from "@/components/spending-categories-card";
import { BudgetOverviewCard } from "@/components/budget-overview";
import { SpendingTrendsCard } from "@/components/spending-trends-card";
import { SpendingCardPopin } from "@/components/spending-card-popin";
import { CategoryPopin } from "@/components/category-creation-popin";
import { StickyBudgetBar } from "@/components/sticky-budget-bar";
import { createCategory, createEntry, createSpending, deleteCategory, deleteEntry, deleteSpending, getCategories, getIncome, getSpending, saveIncome, updateCategory, updateEntry, updateSpending } from "@/lib/api";
import { useEffect } from "react";
import { Category, SpendingItem } from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";
import { IncomeCard } from "@/components/income/income-card";

type SpendingData = Record<string, SpendingItem[]>;
type IncomeData = Record<string, { active: number; passive: number }>;

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
  const [incomeData, setIncomeData] = useState<IncomeData>({});
  const [spendingData, setSpendingData] = useState<SpendingData>({});

  useEffect(() => {
    async function loadAllData() {
      try {
        const [categoriesData, incomeDataResult, spendingDataResult] = await Promise.all([
          getCategories(),
          getIncome(),
          getSpending()
        ]);
        
        setCategories(categoriesData);
        setIncomeData(incomeDataResult);
        setSpendingData(spendingDataResult);
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
  const currentIncome = incomeData[selectedMonth] || { active: 0, passive: 0 };

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

  // Month Handlers
  const handleMonthChange = async (newMonth: string) => {
  setSelectedMonth(newMonth);
  
  // Handle income
  if (!incomeData[newMonth]) {
    const sortedMonths = Object.keys(incomeData).sort();
    const previousMonths = sortedMonths.filter(m => m < newMonth);
    
    if (previousMonths.length > 0) {
      const closestMonth = previousMonths[previousMonths.length - 1];
      const previousIncome = incomeData[closestMonth];
      
      try {
        await saveIncome({ 
          month: newMonth, 
          active: previousIncome.active, 
          passive: previousIncome.passive 
        });
        
        setIncomeData(data => ({
          ...data,
          [newMonth]: { ...previousIncome }
        }));
      } catch (error) {
        console.error('Failed to copy income:', error);
      }
    }
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

  // Income Handlers
  const handleActiveIncomeChange = (active: number) => {
    // update state
    setIncomeData(data => ({
      ...data,
      [selectedMonth]: {
        ...data[selectedMonth],
        active: active
      },
    }));
  };

  const handleActiveIncomeCommit = async(active: number) => {
    // update database
    await saveIncome({month: selectedMonth, active});
  };

  const handlePassiveIncomeChange = (passive: number) => {
    // update state
    setIncomeData(data => ({
      ...data,
      [selectedMonth]: {
        ...data[selectedMonth],
        passive: passive
      }
    }));
  };

  const handlePassiveIncomeCommit = async(passive: number) => {
    // update database
    await saveIncome({month: selectedMonth, passive});
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
          incomeData={Object.entries(incomeData)
            .filter(([month]) => month <= selectedMonth)
            .map(([month, income]) => ({
              month,
              income,
            }))}
          categories={categories}
          onClose={() => setShowTrends(false)}
        />
      )}

      <IncomeCard 
        incomes={[
            { id: '1', name: 'Salary', amount: 5000, type: 'active', icon: 'fuel', startDate: new Date(), note: '' },
            { id: '2', name: 'Freelance', amount: 1500, type: 'active', icon: 'laptop', startDate: new Date(), note: '' },
            // { id: '3', name: 'Dividends', amount: 500, type: 'passive', icon: 'chart', startDate: new Date(), note: '' },
        ]}
        onAdd={() => console.log('add')}
        onSelect={(id: string) => console.log('select', id)}
      />

      <div data-spending-section>
        <SpendingCategoriesCard
          title="Spending Categories"
          legend="Track budgeted vs actual spending"
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          spendingItems={currentSpendingItems}
          totalIncome={currentIncome.active + currentIncome.passive}
          onSpendingChange={handleSpendingChange}
          onSpendingCommit={handleSpendingCommit}
          onOpenCreateSpending={handleOpenCreateSpending}
          onEditSpendingItem={handleOpenEditSpending}
          onEditCategory={handleOpenEditCategory}
          onAddEntry={handleAddEntry}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
        />
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
          totalIncome={currentIncome.active + currentIncome.passive}
          categories={categories}
          spendingItems={currentSpendingItems}
        />
      </div>

      <StickyBudgetBar
          totalIncome={currentIncome.active + currentIncome.passive}
          totalBudgeted={currentSpendingItems.reduce((sum, item) => sum + item.budgeted, 0)}
          totalSpent={currentSpendingItems.reduce((sum, item) => sum + item.spent, 0)}
      />
    </div>
  );
}