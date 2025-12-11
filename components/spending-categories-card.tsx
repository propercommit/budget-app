import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CategoryChip } from "./category-chip";

interface Category {
    icon?: LucideIcon;
    label: string;
    color: string;
}

interface SpendingCategoriesCardProps {
    title: string;
    legend: string;
    categories: Category[],
    selectedCategory: string | null,
    onSelectCategory: (category: string | null) => void;

};

export function SpendingCategoriesCard({title, legend, categories, selectedCategory, onSelectCategory}: SpendingCategoriesCardProps) {
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
            </CardContent>
        </Card>
    );
}

