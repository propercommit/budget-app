"use client"
import { Header } from "@/components/header";
import { MonthPicker } from "@/components/month-picker";
import { GraphToggleBtn } from "@/components/graph-toggle-button";
import { MonthlyIncomeCard } from "@/components/monthly-income-card";
import { DollarSign, ShoppingCart, Home as HomeIcon, Utensils } from "lucide-react";
import { useState } from "react";
import { SpendingCategoriesCard } from "@/components/spending-categories-card";


export default function Home() {

  //hooks
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [spendingItems, setSpendingItems] = useState([
    { id: "1", name: "Groceries", icon: ShoppingCart, budgeted: 500, spent: 350, category: "Food" },
    { id: "2", name: "Rent", icon: HomeIcon, budgeted: 1200, spent: 1200, category: "Housing" },
  ]);
  const [activeIncome, setActiveIncome] = useState(0);
  const [passiveIncome, setPassiveIncome] = useState(0);


  const handleSpendingChange = (id: string, budgeted: number, spent: number) => {
      setSpendingItems(items => 
          items.map(item => 
              item.id === id ? { ...item, budgeted, spent } : item
          )
      );
  };

  const handleAddSpending = (name: string, category: string, icon: string | null) => {
    const newItem = {
      id: Date.now().toString(), // unique id
      name: name,
      icon: icon || "shopping-cart",
      budgeted: 0,
      spent: 0,
      category: category
    };
    setSpendingItems([...spendingItems, newItem]);
  }

  // test data
  const testCategories = [
    { icon: ShoppingCart, label: "Shopping", color: "#3b82f6" },
    { icon: HomeIcon, label: "Housing", color: "#10b981" },
    { icon: Utensils, label: "Food", color: "#f59e0b" },
  ];

  return (

    <div className="p-6 max-w-5xl mx-auto">
      <Header Icon={DollarSign} title="Budget Planner" legendLabel="Take control of your finances with smart insights and personalized advice"/>
      <div className="flex justify-between">
        <MonthPicker label="December 2025" />
        <GraphToggleBtn label="trends"/>
      </div>
      
      <MonthlyIncomeCard 
        title="Monthly Income"
        legend="Enter your active and passive income sources"
        progressBarTitle="Income Distribution"
        leftSliderTitle="Active Income"
        leftSliderLegend="Salary, wages, freelance" 
        rightSliderTitle="Passive Income"
        rightSliderLegend="Investments, rentals, dividends"
        activeIncome={activeIncome}
        passiveIncome={passiveIncome}
        onActiveIncomeChange={setActiveIncome}
        onPassiveIncomeChange={setPassiveIncome}
      />

      <SpendingCategoriesCard
        title="Spending Categories"
        legend="Track budgeted vs actual spending"
        categories={testCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        spendingItems={spendingItems}
        totalIncome={5000}
        onSpendingChange={handleSpendingChange}
        onAddSpending={handleAddSpending}
      />
    </div>
  );
}