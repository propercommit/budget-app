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
import { createCategory, deleteCategory, getCategories } from "@/lib/api";
import { useEffect } from "react";
import { Category, SpendingItem } from "@/lib/types";

type SpendingData = Record<string, SpendingItem[]>;
type IncomeData = Record<string, { active: number; passive: number }>;

export default function Home() {
  // State
  const [selectedMonth, setSelectedMonth] = useState("2025-12");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  
  // Spending Popin State
  const [isSpendingPopinOpen, setIsSpendingPopinOpen] = useState(false);
  const [editingSpendingItem, setEditingSpendingItem] = useState<SpendingItem | null>(null);
  
  // Category Popin State
  const [isCategoryPopinOpen, setIsCategoryPopinOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    }
    loadCategories();
  }, []);

  const [incomeData, setIncomeData] = useState<IncomeData>({
    "2025-09": { active: 3500, passive: 400 },
    "2025-10": { active: 3500, passive: 450 },
    "2025-11": { active: 3800, passive: 450 },
    "2025-12": { active: 4000, passive: 500 },
  });

  const [spendingData, setSpendingData] = useState<SpendingData>({
    "2025-09": [
      { id: "1", name: "Groceries", icon: "shopping-cart", budgeted: 500, spent: 320, category: "Food" },
      { id: "2", name: "Rent", icon: "home", budgeted: 1200, spent: 1200, category: "Housing" },
    ],
    "2025-10": [
      { id: "1", name: "Groceries", icon: "shopping-cart", budgeted: 500, spent: 380, category: "Food" },
      { id: "2", name: "Rent", icon: "home", budgeted: 1200, spent: 1200, category: "Housing" },
    ],
    "2025-11": [
      { id: "1", name: "Groceries", icon: "shopping-cart", budgeted: 500, spent: 410, category: "Food" },
      { id: "2", name: "Rent", icon: "home", budgeted: 1200, spent: 1200, category: "Housing" },
    ],
    "2025-12": [
      { id: "1", name: "Groceries", icon: "shopping-cart", budgeted: 500, spent: 350, category: "Food" },
      { id: "2", name: "Rent", icon: "home", budgeted: 1200, spent: 1200, category: "Housing" },
    ],
  });

  // Derived values
  const currentSpendingItems = spendingData[selectedMonth] || [];
  const currentIncome = incomeData[selectedMonth] || { active: 0, passive: 0 };

  // Spending Popin Handlers
  const handleOpenCreateSpending = () => {
    setEditingSpendingItem(null);
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
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    
    setSpendingData(currentData => {
      if (currentData[newMonth]) return currentData;
      
      const sortedMonths = Object.keys(currentData).sort();
      const previousMonths = sortedMonths.filter(m => m < newMonth);
      
      if (previousMonths.length === 0) return currentData;
      
      const closestMonth = previousMonths[previousMonths.length - 1];
      const previousData = currentData[closestMonth];
      
      const newMonthData = previousData.map(item => ({
        ...item,
        id: Date.now().toString() + Math.random().toString().slice(2, 8),
        spent: 0,
      }));
      
      return {
        ...currentData,
        [newMonth]: newMonthData,
      };
    });

    setIncomeData(currentData => {
      if (currentData[newMonth]) return currentData;
      
      const sortedMonths = Object.keys(currentData).sort();
      const previousMonths = sortedMonths.filter(m => m < newMonth);
      
      if (previousMonths.length === 0) return currentData;
      
      const closestMonth = previousMonths[previousMonths.length - 1];
      
      return {
        ...currentData,
        [newMonth]: { ...currentData[closestMonth] },
      };
    });
  };

  // Income Handlers
  const handleActiveIncomeChange = (value: number) => {
    setIncomeData(data => ({
      ...data,
      [selectedMonth]: { 
        ...data[selectedMonth], 
        active: value 
      },
    }));
  };

  const handlePassiveIncomeChange = (value: number) => {
    setIncomeData(data => ({
      ...data,
      [selectedMonth]: { 
        ...data[selectedMonth], 
        passive: value 
      },
    }));
  };

  // Spending Handlers
  const handleSpendingChange = (id: string, budgeted: number, spent: number) => {
    setSpendingData(data => ({
      ...data,
      [selectedMonth]: data[selectedMonth].map(item =>
        item.id === id ? { ...item, budgeted, spent } : item
      ),
    }));
  };

  const handleAddSpending = (name: string, category: string, icon: string | null) => {
    const newItem = {
      id: Date.now().toString(),
      name: name,
      icon: icon || "shopping-cart",
      budgeted: 0,
      spent: 0,
      category: category
    };
    setSpendingData(data => ({
      ...data,
      [selectedMonth]: [...data[selectedMonth], newItem],
    }));
  };

  const handleEditSpending = (id: string, name: string, category: string, icon: string) => {
    setSpendingData(data => ({
      ...data,
      [selectedMonth]: data[selectedMonth].map(item =>
        item.id === id ? { ...item, name, category, icon } : item
      ),
    }));
  };

  const handleDeleteSpending = (id: string) => {
    setSpendingData(data => ({
      ...data,
      [selectedMonth]: data[selectedMonth].filter(item => item.id !== id)
    }));
  };

  // Category Handlers
  const handleAddCategory = async (name: string, icon: string, color: string) => {
    try {
      const newCategory = await createCategory({ label: name, icon, color });
      setCategories([...categories, newCategory]);
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  };

  const handleEditCategory = (oldLabel: string, name: string, icon: string, color: string) => {
    // Update the category
    setCategories(categories.map(cat =>
      cat.label === oldLabel ? { label: name, icon, color } : cat
    ));
    
    // Update all spending items that use this category
    if (oldLabel !== name) {
      setSpendingData(data => {
        const updatedData: SpendingData = {};
        for (const month in data) {
          updatedData[month] = data[month].map(item =>
            item.category === oldLabel ? { ...item, category: name } : item
          );
        }
        return updatedData;
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try{
      await deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      if (selectedCategory === id) {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <Header 
        title="Budget Planner" 
        legendLabel="Take control of your finances with smart insights and personalized advice"
      />
      
      <div className="flex justify-between">
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
      
      <MonthlyIncomeCard 
        title="Monthly Income"
        legend="Enter your active and passive income sources"
        progressBarTitle="Income Distribution"
        leftSliderTitle="Active Income"
        leftSliderLegend="Salary, wages, freelance" 
        rightSliderTitle="Passive Income"
        rightSliderLegend="Investments, rentals, dividends"
        activeIncome={currentIncome.active}
        passiveIncome={currentIncome.passive}
        onActiveIncomeChange={handleActiveIncomeChange}
        onPassiveIncomeChange={handlePassiveIncomeChange}
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
          onOpenCreateSpending={handleOpenCreateSpending}
          onEditSpendingItem={handleOpenEditSpending}
          onEditCategory={handleOpenEditCategory}
        />
      </div>

      <SpendingCardPopin
        key={`spending-${editingSpendingItem?.id ?? "create"}`}
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