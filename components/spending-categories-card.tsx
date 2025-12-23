"use client"
import { LucideIcon, Plus, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CategoryChip } from "./category-chip";
import { SpendingCard } from "./spending-card";
import { Button } from "./ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ShoppingCart, Fuel, HeartPulse, Lightbulb, Film, PiggyBank, Home, Car, CreditCard, Phone, Utensils, Plane } from "lucide-react";
import { iconMap, availableIcons } from "@/lib/icon-map";

interface Category {
    icon?: LucideIcon;
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

                        <div className="space-y-3">
                            <Label>Icon</Label>
                            <div className="flex gap-2 border-b">
                                <button
                                onClick={() => setIconSource("preset")}    
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    iconSource === "preset"
                                    ? "border-b-2 border-primary text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}>
                                    Choose Icon
                                </button>
                                <button
                                    onClick={() => setIconSource("upload")}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    iconSource === "upload"
                                        ? "border-b-2 border-primary text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}  
                                >
                                    Upload Icon
                                </button>
                            </div>
                            {iconSource === "preset" ? (
                                <div className="grid grid-cols-4 gap-2">
                                    {availableIcons.map((icon) => (
                                        <button
                                            key={icon.id}
                                            onClick={() => setSelectedIcon(icon.id)}
                                            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                                                selectedIcon === icon.id
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:border-primary/50"
                                            }`}
                                        >
                                            {iconMap[icon.id]}
                                            <span className="text-xs">{icon.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-border rounded-lg">
                                    {customIconUrl ? (
                                        <div className="flex flex-col items-center gap-2">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={customIconUrl} alt="Custom icon" className="w-12 h-12 object-contain" />
                                            <p className="text-xs text-muted-foreground">Icon uploaded!</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Upload your custom icon</p>
                                        </>
                                    )}
                                    <Label
                                        htmlFor="icon-upload"
                                        className="cursor-pointer px-4 py-2 text-sm border rounded-md hover:bg-accent"
                                    >
                                        {customIconUrl ? "Change Icon" : "Select File"}
                                    </Label>
                                    <Input
                                        id="icon-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleIconUpload}
                                    />
                                </div>
                            )}
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

