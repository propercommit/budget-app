"use client"
import { Header } from "@/components/header";
import { MonthPicker } from "@/components/month-picker";
import { GraphToggleBtn } from "@/components/graph-toggle-button";
import { MonthlyIncomeCard } from "@/components/income-card";
import { DollarSign } from "lucide-react";


export default function Home() {

  return (

    <div className="p-6 max-w-5xl mx-auto">
      <Header Icon={DollarSign} title="Budget Planner" legendLabel="Take control of your finances with smart insights and personalized advice"/>
      <div className="flex justify-between">
        <MonthPicker label="December 2025" />
        <GraphToggleBtn label="trends" toggleColor="green"/>
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
    </div>
  );
}