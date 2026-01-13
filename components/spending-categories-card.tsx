"use client"
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CategoryChip } from "./category-chip";
import { SpendingCard } from "./spending-card";
import { Button } from "./ui/button";
import { useState } from "react";
import { SpendingCardPopin } from "./spending-card-popin";

interface Category {
    icon?: string;
    label: string;
    color: string;
}

export interface SpendingItem {
    id: string;
    name: string;
    icon: string;
    budgeted: number;
    spent: number;
    category: string;
}

interface SpendingCategoriesCardProps {
    title: string;
    legend: string;
    categories: Category[],
    selectedCategory: string | null,
    onSelectCategory: (category: string | null) => void;
    spendingItems: SpendingItem[];
    totalIncome: number;
    onSpendingChange: (id: string, budgeted: number, spent: number) => void;
    onAddSpending: (name: string, category: string, icon: string | null) => void;
    onAddCategory: (name: string, icon: string, color: string) => void;
};

export function SpendingCategoriesCard({title, legend, categories, selectedCategory, onSelectCategory, spendingItems, totalIncome, onSpendingChange, onAddSpending, onAddCategory}: SpendingCategoriesCardProps) {

    const [isPopinOpen, setIsPopinOpen] = useState(false);
    
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
                        icon= {c.icon}
                        label={c.label}
                        color={c.color}
                        selected={selectedCategory === c.label}
                        onClick={() => onSelectCategory(c.label)}
                    />
                ))}
                </div>
                <SpendingCardPopin
                    isOpen={isPopinOpen}
                    onOpenChange={setIsPopinOpen}
                    onAddSpending={onAddSpending}
                    onAddCategory={onAddCategory}
                    categories={categories}
                    
                />
                <div className="flex flex-col gap-4 mt-4">
                    {spendingItems
                        .filter(item => selectedCategory === null || item.category === selectedCategory)
                        .map(item => (
                            <SpendingCard
                                key={item.id}
                                name={item.name}
                                icon={item.icon}
                                budgeted={item.budgeted}
                                spent={item.spent}
                                category={item.category}
                                categoryColor={categories.find(c => c.label === item.category)?.color || "#6b7280"}
                                totalIncome={totalIncome}
                                onBudgetedChange={(value) => onSpendingChange(item.id, value, item.spent)}
                                onSpentChange={(value) => onSpendingChange(item.id, item.budgeted, value)}
                            />
                        ))
                    }                    
                </div>
            <Button 
                variant="outline" 
                size="sm" 
                className="!bg-blue-500 hover:!bg-blue-600 gap-2 w-full mt-3"
                onClick={() => setIsPopinOpen(true)}
                >
                    <Plus className="w-4 h-4"/>
                Add Custom
             </Button>
            </CardContent>
        </Card>
    );
}

