"use client"
import { LucideIcon, Plus, ShoppingBagIcon, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CategoryChip } from "./category-chip";
import { SpendingCard } from "./spending-card";
import { Button } from "./ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { iconMap, availableIcons } from "@/lib/icon-map";

interface Category {
    icon?: string;
    label: string;
    color: string;
}

interface SpendingItem {
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
};

export function SpendingCategoriesCard({title, legend, categories, selectedCategory, onSelectCategory, spendingItems, totalIncome, onSpendingChange, onAddSpending}: SpendingCategoriesCardProps) {

    const [isPopinOpen, setIsPopinOpen] = useState(false);
    const [spendingCardName, setSpendingCardName] = useState("");
    const [spendingCategory, setSpendingCategory] = useState("");
    const [showValidationMessage, setShowValidationMessage] = useState(false);
    const [iconSource, setIconSource] = useState<"preset" | "upload">("preset");
    const [selectedIcon, setSelectedIcon] = useState("shopping-cart");
    const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);

    const handleAddClick = () => {
        const valid = validation();

        if(valid == false) {
            setShowValidationMessage(true);
        } else {
            const iconToUse = iconSource === "preset" ? selectedIcon : customIconUrl;
            
            setShowValidationMessage(false);
            onAddSpending(spendingCardName, spendingCategory, iconToUse);
            setSpendingCardName("");
            setSpendingCategory("");
            setSelectedIcon("shopping-cart");
            setCustomIconUrl(null);
            setIconSource("preset");
            setIsPopinOpen(false);
        }
    };

    const validation = () => {
        if(spendingCardName == "" || spendingCategory == "") return false;
        return true;
    }

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCustomIconUrl(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
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
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 w-full mt-3"
                    onClick={() => setIsPopinOpen(true)}
                    >
                        <Plus className="w-4 h-4"/>
                        Add Custom
                </Button>

                // put spending card popin here

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

