import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { IconPicker } from "./icon-picker";
import { ColorPicker } from "./color-picker";
import { iconMap } from "@/lib/icon-map";

interface CategoryPopinProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddCategory: (name: string, icon: string, color: string) => void;
}

export function CategoryPopin({ isOpen, onOpenChange, onAddCategory }: CategoryPopinProps) {
    const [categoryName, setCategoryName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("shopping-cart");
    const [selectedColor, setSelectedColor] = useState("#3b82f6");
    const [showValidationMessage, setShowValidationMessage] = useState(false);

    const handleCreateClick = () => {
        if (categoryName === "") {
            setShowValidationMessage(true);
            return;
        }

        onAddCategory(categoryName, selectedIcon, selectedColor);
        setCategoryName("");
        setSelectedIcon("shopping-cart");
        setSelectedColor("#3b82f6");
        setShowValidationMessage(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            onOpenChange(open);
            if (!open) setShowValidationMessage(false);
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                    <DialogDescription>Add a custom category with name, icon, and color</DialogDescription>
                </DialogHeader>

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

                    <Button className="w-full bg-green-500" onClick={handleCreateClick}>Create Category</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}