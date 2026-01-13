import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Category } from "@/lib/category";
import { IconPicker } from "./icon-picker";
import { CategoryPopin } from "./category-creation-popin";

interface SpendingCardPopinProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddSpending: (name: string, category: string, icon: string | null) => void;
    onAddCategory: (name: string, icon: string, color: string) => void;
    categories: Category[];
}

export function SpendingCardPopin({isOpen, onOpenChange, onAddSpending, onAddCategory, categories}: SpendingCardPopinProps) {
    const [spendingCardName, setSpendingCardName] = useState("");
    const [spendingCategory, setSpendingCategory] = useState("");
    const [showValidationMessage, setShowValidationMessage] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState("shopping-cart");
    const [isCategoryPopinOpen, setIsCategoryPopinOpen] = useState(false);

    const handleAddClick = () => {
        const valid = validation();

        if (valid === false) {
            setShowValidationMessage(true);
        } else {
            setShowValidationMessage(false);
            onAddSpending(spendingCardName, spendingCategory, selectedIcon);
            setSpendingCardName("");
            setSpendingCategory("");
            setSelectedIcon("shopping-cart");
            onOpenChange(false);
        }
    };

    const handleAddCategory = (name: string, icon: string, color: string) => {
        onAddCategory(name, icon, color);
        setSpendingCategory(name);
    };

    const validation = () => {
        if (spendingCardName === "" || spendingCategory === "") return false;
        return true;
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => {
                onOpenChange(open);
                if (!open) setShowValidationMessage(false);
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
                            <Select value={spendingCategory} onValueChange={(value) => {
                                if (value === "create-new") {
                                    setIsCategoryPopinOpen(true);
                                } else {
                                    setSpendingCategory(value);
                                }
                            }}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.label} value={c.label}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="create-new" className="text-green-600 font-medium bg-green-50 text-center">
                                        Create New Category
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                        {showValidationMessage && (
                            <p className="text-red-500 text-sm">Please fill in all fields</p>
                        )}
                        <Button className="w-full" onClick={handleAddClick}>Add Spending</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <CategoryPopin
                isOpen={isCategoryPopinOpen}
                onOpenChange={setIsCategoryPopinOpen}
                onAddCategory={handleAddCategory}
            />
        </>
    );
}