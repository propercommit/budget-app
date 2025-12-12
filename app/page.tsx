"use client"
import { Header } from "@/components/header";
import { MonthPicker } from "@/components/month-picker";
import { GraphToggleBtn } from "@/components/graph-toggle-button";
import { MonthlyIncomeCard } from "@/components/monthly-income-card";
import { DollarSign, ShoppingCart, Home as HomeIcon, Utensils } from "lucide-react";
import { useState } from "react";
import { SpendingCategoriesCard } from "@/components/spending-categories-card";
import { SpendingCard } from "@/components/spending-card";


export default function Home() {

  //hooks
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // test data
  const testCategories = [
    { icon: ShoppingCart, label: "Shopping", color: "#3b82f6" },
    { icon: HomeIcon, label: "Housing", color: "#10b981" },
    { icon: Utensils, label: "Food", color: "#f59e0b" },
  ];

  const [testBudgeted, setTestBudgeted] = useState(500);
  const [testSpent, setTestSpent] = useState(350);

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
      />

      <SpendingCategoriesCard
        title="Spending Categories"
        legend="Track budgeted vs actual spending"
        categories={testCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <SpendingCard
          name="Groceries"
          icon={ShoppingCart}
          budgeted={testBudgeted}
          spent={testSpent}
          category="Food"
          categoryColor="#f59e0b"
          totalIncome={5000}
          onBudgetedChange={setTestBudgeted}
          onSpentChange={setTestSpent}
      />
    </div>
  );
}