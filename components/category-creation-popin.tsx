import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { IconPicker } from "./icon-picker";

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

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            type="text"
                            placeholder="e.g. Entertainment"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                        />
                    </div>

                    <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer border-0"
                            />
                            <Input
                                type="text"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                className="flex-1"
                                placeholder="#3b82f6"
                            />
                        </div>
                    </div>

                    {showValidationMessage && (
                        <p className="text-red-500 text-sm">Please enter a category name</p>
                    )}

                    <Button className="w-full" onClick={handleCreateClick}>Create Category</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}