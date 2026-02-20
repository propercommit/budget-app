import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { IconPicker } from "../icon-picker";
import { ColorPicker } from "../color-picker";
import { iconMap } from "@/lib/icon-map";

interface Category {
    id: string;
    icon: string;
    label: string;
    color: string;
}

interface CategoryPopinProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddCategory: (name: string, icon: string, color: string) => void;
    onEditCategory?: (id: string, name: string, icon: string, color: string) => void;
    onDeleteCategory?: (label: string) => void;
    mode?: "create" | "edit";
    editingCategory?: Category | null;
}

export function CategoryPopin({
    isOpen,
    onOpenChange,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    mode = "create",
    editingCategory = null,
}: CategoryPopinProps) {
    const [categoryName, setCategoryName] = useState(editingCategory?.label ?? "");
    const [selectedIcon, setSelectedIcon] = useState(editingCategory?.icon ?? "shopping-cart");
    const [selectedColor, setSelectedColor] = useState(editingCategory?.color ?? "#3b82f6");
    const [showValidationMessage, setShowValidationMessage] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSubmit = () => {
        console.log('handleSubmit - editingCategory:', editingCategory);
        console.log('handleSubmit - editingCategory?.id:', editingCategory?.id);
        if (categoryName === "") {
            setShowValidationMessage(true);
            return;
        }

        if (mode === "edit" && editingCategory && onEditCategory) {
            onEditCategory(editingCategory.id, categoryName, selectedIcon, selectedColor);
        } else {
            onAddCategory(categoryName, selectedIcon, selectedColor);
        }

        setShowValidationMessage(false);
        onOpenChange(false);
    };

    const handleDelete = () => {
        if (editingCategory && onDeleteCategory) {
            onDeleteCategory(editingCategory.id);
            setShowDeleteConfirm(false);
            onOpenChange(false);
        }
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
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? "Edit Category" : "Create New Category"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Update this category" : "Add a custom category with name, icon, and color"}
                    </DialogDescription>
                </DialogHeader>

                {showDeleteConfirm ? (
                    <div className="space-y-4 py-4">
                        <p className="text-center">
                            Are you sure you want to delete <strong>{editingCategory?.label}</strong>?
                        </p>
                        <p className="text-sm text-muted-foreground text-center">
                            This will also delete all spending items in this category. This action cannot be undone.
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
                    <>
                        {/* Preview */}
                        <div className="flex justify-center py-2">
                            <div
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                                style={{ backgroundColor: selectedColor }}
                            >
                                {selectedIcon.startsWith("data:") ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedIcon} alt="" className="w-4 h-4" />
                                ) : (
                                    iconMap[selectedIcon]
                                )}
                                {categoryName || "Category Name"}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Category Name</Label>
                                <Input
                                    type="text"
                                    placeholder="e.g. Entertainment"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category Color</Label>
                                <ColorPicker value={selectedColor} onChange={setSelectedColor} />
                            </div>

                            <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                            {showValidationMessage && (
                                <p className="text-red-500 text-sm">Please enter a category name</p>
                            )}

                            <Button className="w-full bg-green-500" onClick={handleSubmit}>
                                {isEditMode ? "Save Changes" : "Create Category"}
                            </Button>

                            {isEditMode && (
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Delete Category
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}