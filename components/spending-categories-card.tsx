"use client"
import { useState } from "react";
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
    onAddEntry: (spendingItemId: string, entry: { name: string; amount: number; receiptUrl?: string; link?: string }) => void;
    onUpdateEntry: (spendingItemId: string, entryId: string, data: { name?: string; amount?: number; receiptUrl?: string; link?: string }) => void;
    onDeleteEntry: (spendingItemId: string, entryId: string) => void;
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
    onAddEntry,
    onUpdateEntry,
    onDeleteEntry,
}: SpendingCategoriesCardProps) {
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);

    return (
        <Card className="mt-6">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{legend}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Advanced</span>
                        <button
                            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isAdvancedMode ? "bg-green-500" : "bg-gray-300"
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isAdvancedMode ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 flex-wrap">
                    <CategoryChip
                        label="All"
                        icon="all"
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
                        .filter(item => {
                            if (selectedCategory === null) return true;
                            const categoryData = categories.find(c => c.id === item.categoryId);
                            return categoryData?.label === selectedCategory;
                        })
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
                                    isAdvancedMode={isAdvancedMode}
                                    entries={item.entries || []}
                                    onAddEntry={(entry) => onAddEntry(item.id, entry)}
                                    onUpdateEntry={(entryId, data) => onUpdateEntry(item.id, entryId, data)}
                                    onDeleteEntry={(entryId) => onDeleteEntry(item.id, entryId)}
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