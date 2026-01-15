import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Category } from "@/lib/category";
import { IconPicker } from "./icon-picker";
import { CategoryPopin } from "./category-creation-popin";
import { iconMap } from "@/lib/icon-map";

interface SpendingItem {
    id: string;
    name: string;
    icon: string;
    category: string;
}

interface SpendingCardPopinProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddSpending: (name: string, category: string, icon: string | null) => void;
    onEditSpending?: (id: string, name: string, category: string, icon: string) => void;
    onDeleteSpending?: (id: string) => void;
    onAddCategory: (name: string, icon: string, color: string) => void;
    categories: Category[];
    mode?: "create" | "edit";
    editingItem?: SpendingItem | null;
}

export function SpendingCardPopin({
    isOpen,
    onOpenChange,
    onAddSpending,
    onEditSpending,
    onDeleteSpending,
    onAddCategory,
    categories,
    mode = "create",
    editingItem = null,
}: SpendingCardPopinProps) {
    const [spendingCardName, setSpendingCardName] = useState(editingItem?.name ?? "");
    const [spendingCategory, setSpendingCategory] = useState(editingItem?.category ?? "");
    const [selectedIcon, setSelectedIcon] = useState(editingItem?.icon ?? "shopping-cart");
    const [showValidationMessage, setShowValidationMessage] = useState(false);
    const [isCategoryPopinOpen, setIsCategoryPopinOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const selectedCategoryColor = categories.find(c => c.label === spendingCategory)?.color ?? "#6b7280";

    const handleSubmit = () => {
        if (spendingCardName === "" || spendingCategory === "") {
            setShowValidationMessage(true);
            return;
        }

        setShowValidationMessage(false);

        if (mode === "edit" && editingItem && onEditSpending) {
            onEditSpending(editingItem.id, spendingCardName, spendingCategory, selectedIcon);
        } else {
            onAddSpending(spendingCardName, spendingCategory, selectedIcon);
        }

        onOpenChange(false);
    };

    const handleDelete = () => {
        if (editingItem && onDeleteSpending) {
            onDeleteSpending(editingItem.id);
            setShowDeleteConfirm(false);
            onOpenChange(false);
        }
    };

    const handleAddCategory = (name: string, icon: string, color: string) => {
        onAddCategory(name, icon, color);
        setSpendingCategory(name);
    };

    const handleOpenChange = (open: boolean) => {
        if (!open && showDeleteConfirm) {
            // If trying to close while in delete confirmation, just go back to edit form
            setShowDeleteConfirm(false);
            return;
        }
        onOpenChange(open);
    };

    const isEditMode = mode === "edit";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditMode ? "Edit Spending Item" : "Add Custom Spending Card"}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditMode ? "Update this spending item" : "Create a new spending item"}
                        </DialogDescription>
                    </DialogHeader>

                    {showDeleteConfirm ? (
                        <div className="space-y-4 py-4">
                            <p className="text-center">
                                Are you sure you want to delete <strong>{editingItem?.name}</strong>?
                            </p>
                            <p className="text-sm text-muted-foreground text-center">
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteConfirm(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleDelete}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Preview */}
                            <div className="flex justify-center py-2">
                                <div
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
                                    style={{ 
                                        backgroundColor: `${selectedCategoryColor}15`,
                                        borderColor: `${selectedCategoryColor}40`
                                    }}
                                >
                                    <div 
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: `${selectedCategoryColor}30` }}
                                    >
                                        {selectedIcon.startsWith("data:") ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={selectedIcon} alt="" className="w-5 h-5 object-contain" />
                                        ) : (
                                            iconMap[selectedIcon] || iconMap["shopping-cart"]
                                        )}
                                    </div>
                                    <span className="font-medium">
                                        {spendingCardName || "Spending Item"}
                                    </span>
                                    {spendingCategory && (
                                        <span 
                                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white ml-2"
                                            style={{ backgroundColor: selectedCategoryColor }}
                                        >
                                            {spendingCategory}
                                        </span>
                                    )}
                                </div>
                            </div>

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
                                <p className="text-red-500 text-lg">Please fill in all fields</p>
                            )}

                            <Button className="w-full" onClick={handleSubmit}>
                                {isEditMode ? "Save Changes" : "Add Spending"}
                            </Button>

                            {isEditMode && (
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Delete Spending Item
                                </Button>
                            )}
                        </div>
                    )}
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