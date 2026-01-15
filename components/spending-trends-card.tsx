"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { Category } from "@/lib/category";
import { SpendingItem } from "./spending-categories-card";
import { AreaLineChart } from "./area-line-chart";

interface MonthData {
    month: string;
    spending: SpendingItem[];
}

interface IncomeMonthData {
    month: string;
    income: { active: number; passive: number };
}

interface SpendingTrendsCardProps {
    historicalData: MonthData[];
    incomeData: IncomeMonthData[];
    categories: Category[];
    onClose: () => void;
}

export function SpendingTrendsCard({ historicalData, incomeData, categories, onClose }: SpendingTrendsCardProps) {
    // Transform spending data
    const overallSpendingData = historicalData.map(monthData => {
        const totalSpent = monthData.spending.reduce((sum, item) => sum + item.spent, 0);
        const date = new Date(monthData.month + "-01");
        return {
            monthLabel: date.toLocaleDateString("en-US", { month: "short" }),
            value: totalSpent,
        };
    });

    const categoryData = categories.map(category => {
        const data = historicalData.map(monthData => {
            const categorySpent = monthData.spending
                .filter(item => item.category === category.label)
                .reduce((sum, item) => sum + item.spent, 0);
            const date = new Date(monthData.month + "-01");
            return {
                monthLabel: date.toLocaleDateString("en-US", { month: "short" }),
                value: categorySpent,
            };
        });
        
        const hasSpending = data.some(d => d.value > 0);
        
        return {
            category,
            data,
            hasSpending,
        };
    }).filter(c => c.hasSpending);

    const activeIncomeData = incomeData.map(monthData => {
        const date = new Date(monthData.month + "-01");
        return {
            monthLabel: date.toLocaleDateString("en-US", { month: "short" }),
            value: monthData.income.active,
        };
    });

    const passiveIncomeData = incomeData.map(monthData => {
        const date = new Date(monthData.month + "-01");
        return {
            monthLabel: date.toLocaleDateString("en-US", { month: "short" }),
            value: monthData.income.passive,
        };
    });

    const totalIncomeData = incomeData.map(monthData => {
        const date = new Date(monthData.month + "-01");
        return {
            monthLabel: date.toLocaleDateString("en-US", { month: "short" }),
            value: monthData.income.active + monthData.income.passive,
        };
    });

    return (
        <Card className="mt-6 border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Trends & Evolution</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Spending Section */}
                <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Overall Spending</h3>
                    <AreaLineChart 
                        data={overallSpendingData} 
                        color="#8b5cf6" 
                        height={180} 
                        graphId="overall-spending" 
                    />
                </div>

                <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Spending by Category</h3>
                    <div className="space-y-6">
                        {categoryData.map(({ category, data }) => (
                            <div key={category.label}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {category.label}
                                    </span>
                                </div>
                                <AreaLineChart 
                                    data={data} 
                                    color={category.color} 
                                    height={160} 
                                    graphId={`category-${category.label}`} 
                                />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Income Section */}
                <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Total Income</h3>
                    <AreaLineChart 
                        data={totalIncomeData} 
                        color="#22c55e" 
                        height={180} 
                        graphId="total-income"
                        increaseIsPositive
                    />
                </div>

                <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Income by Type</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-xs font-medium text-muted-foreground">
                                    Active Income
                                </span>
                            </div>
                            <AreaLineChart 
                                data={activeIncomeData} 
                                color="#10b981" 
                                height={160} 
                                graphId="active-income"
                                increaseIsPositive
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-teal-500" />
                                <span className="text-xs font-medium text-muted-foreground">
                                    Passive Income
                                </span>
                            </div>
                            <AreaLineChart 
                                data={passiveIncomeData} 
                                color="#14b8a6" 
                                height={160} 
                                graphId="passive-income"
                                increaseIsPositive
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}