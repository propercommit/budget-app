"use client"
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CategoryChip } from "./category-chip";
import { SpendingCard } from "./spending-card";
import { Button } from "./ui/button";
import { Category, SpendingItem } from "@/lib/types";

interface SpendingCategoriesCardProps {
    title: string;
    legend: string;
    categories: Category[];
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
    spendingItems: SpendingItem[];
    totalIncome: number;
    onSpendingChange: (id: string, budgeted: number, spent: number) => void;
    onSpendingCommit: (id: string, budgeted: number, spent: number) => void;    
    onOpenCreateSpending: () => void;
    onEditSpendingItem: (item: SpendingItem) => void;
    onEditCategory: (category: Category) => void;
}

export function SpendingCategoriesCard({
    title,
    legend,
    categories,
    selectedCategory,
    onSelectCategory,
    spendingItems,
    totalIncome,
    onSpendingChange,
    onSpendingCommit,
    onOpenCreateSpending,
    onEditSpendingItem,
    onEditCategory,
}: SpendingCategoriesCardProps) {
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{legend}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 flex-wrap">
                    <CategoryChip
                        label="All"
                        color="#6b7280"
                        selected={selectedCategory === null}
                        onClick={() => onSelectCategory(null)}
                    />
                    {categories.map((c) => (
                        <CategoryChip 
                            key={c.label}
                            icon={c.icon}
                            label={c.label}
                            color={c.color}
                            selected={selectedCategory === c.label}
                            onClick={() => onSelectCategory(c.label)}
                            onLongPress={() => onEditCategory(c)}
                        />
                    ))}
                </div>

                <div className="flex flex-col gap-4 mt-4">
                    {spendingItems
                        .filter(item => selectedCategory === null || item.category?.label === selectedCategory)
                        .map(item => {
                        const categoryData = categories.find(c => c.id === item.categoryId);                            
                        return (
                                <SpendingCard
                                    key={item.id}
                                    name={item.name}
                                    icon={item.icon}
                                    budgeted={item.budgeted}
                                    spent={item.spent}
                                    category={categoryData?.label ?? "Uncategorized"}
                                    categoryColor={categoryData?.color || "#6b7280"}
                                    categoryIcon={categoryData?.icon}
                                    totalIncome={totalIncome}
                                    onBudgetedChange={(value) => onSpendingChange(item.id, value, item.spent)}
                                    onSpentChange={(value) => onSpendingChange(item.id, item.budgeted, value)}
                                    onBudgetedCommit={(value) => onSpendingCommit(item.id, value, item.spent)}
                                    onSpentCommit={(value) => onSpendingCommit(item.id, item.budgeted, value)}
                                    onEdit={() => onEditSpendingItem(item)}
                                    onEditCategory={() => categoryData && onEditCategory(categoryData)}
                                />
                            );
                        })
                    }                    
                </div>

                <Button 
                    variant="outline" 
                    size="lg" 
                    className="!bg-green-500 hover:!bg-green-600 gap-2 w-full mt-3"
                    onClick={onOpenCreateSpending}
                >
                    <Plus className="w-4 h-4"/>
                    Add Custom
                </Button>
            </CardContent>
        </Card>
    );
}