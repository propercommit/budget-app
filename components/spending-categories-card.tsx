import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CategoryChip } from "./category-chip";
import { SpendingCard } from "./spending-card";

interface Category {
    icon?: LucideIcon;
    label: string;
    color: string;

}

interface SpendingItem {
    id: string;
    name: string;
    icon: LucideIcon;
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
};

export function SpendingCategoriesCard({title, legend, categories, selectedCategory, onSelectCategory, spendingItems, totalIncome, onSpendingChange}: SpendingCategoriesCardProps) {
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
                    />
                ))} 
                </div>
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
            </CardContent>
        </Card>
    );
}

