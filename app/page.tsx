"use client"
import { Header } from "@/components/header";
import { MonthPicker } from "@/components/month-picker";
import { GraphToggleBtn } from "@/components/graph-toggle-button";
import { MonthlyIncomeCard } from "@/components/monthly-income-card";
import { DollarSign } from "lucide-react";
import { useState } from "react";
import { SpendingCategoriesCard } from "@/components/spending-categories-card";
import { BudgetOverviewCard } from "@/components/budget-overview";
import { SpendingTrendsCard } from "@/components/spending-trends-card";

interface SpendingItem {
  id: string;
  name: string;
  icon: string;
  budgeted: number;
  spent: number;
  category: string;
}

type SpendingData = Record<string, SpendingItem[]>;
type IncomeData = Record<string, { active: number; passive: number }>;

export default function Home() {
  // State
  const [selectedMonth, setSelectedMonth] = useState("2025-12");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  
  const [categories, setCategories] = useState([
    { icon: "shopping-cart", label: "Shopping", color: "#3b82f6" },
    { icon: "home", label: "Housing", color: "#10b981" },
    { icon: "utensils", label: "Food", color: "#f59e0b" },
  ]);

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

  // Handlers
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

  const handleAddCategory = (name: string, icon: string, color: string) => {
    setCategories([...categories, { label: name, icon, color }]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Header 
        Icon={DollarSign} 
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

      <SpendingCategoriesCard
        title="Spending Categories"
        legend="Track budgeted vs actual spending"
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        spendingItems={currentSpendingItems}
        totalIncome={currentIncome.active + currentIncome.passive}
        onSpendingChange={handleSpendingChange}
        onAddSpending={handleAddSpending}
        onAddCategory={handleAddCategory}
      />

      <BudgetOverviewCard 
        totalIncome={currentIncome.active + currentIncome.passive}
        categories={categories}
        spendingItems={currentSpendingItems}
      />
    </div>
  );
}