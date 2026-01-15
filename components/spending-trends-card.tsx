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

interface SpendingTrendsCardProps {
    historicalData: MonthData[];
    categories: Category[];
    onClose: () => void;
}

export function SpendingTrendsCard({ historicalData, categories, onClose }: SpendingTrendsCardProps) {
    const overallData = historicalData.map(monthData => {
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

    return (
        <Card className="mt-6 border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Spending Trends & Evolution</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Overall Spending Chart */}
                <div>
                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Overall Spending</h3>
                    <AreaLineChart 
                        data={overallData} 
                        color="#8b5cf6" 
                        height={180} 
                        graphId="overall" 
                    />
                </div>

                {/* Category Charts */}
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
            </CardContent>
        </Card>
    );
} 