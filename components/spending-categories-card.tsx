"use client"
import { LucideIcon, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CategoryChip } from "./category-chip";
import { SpendingCard } from "./spending-card";
import { Button } from "./ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
    onAddSpending: (name: string, category: string) => void;
};

export function SpendingCategoriesCard({title, legend, categories, selectedCategory, onSelectCategory, spendingItems, totalIncome, onSpendingChange, onAddSpending}: SpendingCategoriesCardProps) {

    const [isPopinOpen, setIsPopinOpen] = useState(false);
    const [spendingCardName, setSpendingCardName] = useState("");
    const [spendingCategory, setSpendingCategory] = useState("");
    const [showValidationMessage, setShowValidationMessage] = useState(false);

    const handleAddClick = () => {
        const valid = validation();

        if(valid == false) {
         setShowValidationMessage(true);
        } else {
            setShowValidationMessage(false);
            onAddSpending(spendingCardName, spendingCategory);
            setSpendingCardName("");
            setSpendingCategory("");
            setIsPopinOpen(false);
        }
    };

    const validation = () => {
        if(spendingCardName == "" || spendingCategory == "") return false;
        return true;
    }
    
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
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 w-full mt-3"
                    onClick={() => setIsPopinOpen(true)}
                    >
                        <Plus className="w-4 h-4"/>
                        Add Custom
                </Button>

               <Dialog open={isPopinOpen} onOpenChange={(open) => {
                    setIsPopinOpen(open);
                    if(!open) setShowValidationMessage(false);    
                }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Custom Spending Card</DialogTitle>
                        <DialogDescription>Create a new spending item</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input 
                                type="text"
                                placeholder="e.g. Gym Membership"
                                value={spendingCardName}
                                onChange={(e) => setSpendingCardName(e.target.value)}
                            />
                        </div>    

                        <div className="space-y-2 w-full">
                            <Label>Category</Label>
                            <Select value={spendingCategory} onValueChange={(v) => setSpendingCategory(v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a category"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.label} value={c.label}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {showValidationMessage === true && (
                            <p className="text-red-500 text-sm">Please fill in all fields</p>
                        )}
                        <Button className="w-full" onClick={handleAddClick}>Add Spending</Button>
                    </div>
                </DialogContent>
            </Dialog>

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

