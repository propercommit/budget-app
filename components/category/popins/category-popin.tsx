"use client";

import { useState } from "react";
import { IconPicker } from "@/components/icon-picker";
import { ColorPicker } from "@/components/color-picker";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { iconMap } from "@/lib/icon-map";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
import { CATEGORY_DELETE_WARNING } from "@/lib/constants";

interface CategoryPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; icon: string; color: string }) => void;
    onDelete?: () => void;
    mode: "create" | "edit";
    initialName?: string;
    initialIcon?: string;
    initialColor?: string;
    /** Stacks this popin above another open popin (e.g. Manage Categories at the default z-50). */
    zIndex?: number;
}

export function CategoryPopin({
    isOpen,
    onClose,
    onSave,
    onDelete,
    mode,
    initialName = "",
    initialIcon = "shopping-cart",
    initialColor = "#007AFF",
    zIndex,
}: CategoryPopinProps) {
    const [name, setName] = useState(initialName);
    const [selectedIcon, setSelectedIcon] = useState(initialIcon);
    const [selectedColor, setSelectedColor] = useState(initialColor);
    const [showErrors, setShowErrors] = useState(false);

    const isCreate = mode === "create";
    const isNameValid = name.trim() !== "";
    const isFormValid = isNameValid;

    const getInputStyle = (isValid: boolean) => ({
        backgroundColor: "#F5F5F7",
        border: `1px solid ${showErrors && !isValid ? "#FF3B30" : "#E5E5EA"}`,
        color: "#1D1D1F",
    });

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.borderColor = "#007AFF";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)";
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>, isValid: boolean) => {
        e.currentTarget.style.borderColor = showErrors && !isValid ? "#FF3B30" : "#E5E5EA";
        e.currentTarget.style.boxShadow = "none";
    };

    const handleSave = () => {
        if (!isFormValid) {
            setShowErrors(true);
            return;
        }
        // The API persists the trimmed label — emit the same value so client
        // state (snapshots, label filter) never diverges from the server.
        onSave({ name: name.trim(), icon: selectedIcon, color: selectedColor });
    };

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={isCreate ? "New Category" : "Edit Category"}
            zIndex={zIndex}
            footer={
                <div className="space-y-3">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{
                                backgroundColor: "#34C759",
                                color: "white",
                                boxShadow: "0 4px 12px rgba(52, 199, 89, 0.3)",
                            }}
                        >
                            {isCreate ? "Create Category" : "Save Changes"}
                        </button>
                    </div>
                    {!isCreate && onDelete && (
                        <DeleteConfirmSection
                            label="Delete Category"
                            confirmMessage={CATEGORY_DELETE_WARNING}
                            onDelete={onDelete}
                        />
                    )}
                </div>
            }
        >
            <div className="-mx-5 -mt-5 mb-5 flex justify-center py-4" style={{ backgroundColor: "#FAFAFA" }}>
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold"
                    style={{ backgroundColor: selectedColor }}
                >
                    <span className="text-lg">{iconMap[selectedIcon]}</span>
                    <span>{name || "Category"}</span>
                </div>
            </div>

            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Category Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={30}
                        placeholder="e.g., Transport, Food"
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={getInputStyle(isNameValid)}
                        onFocus={handleFocus}
                        onBlur={(e) => handleBlur(e, isNameValid)}
                    />
                    <p className="text-xs text-right" style={{ color: name.length >= 25 ? "#FF9500" : "#6E6E73" }}>
                        {name.length}/30
                    </p>
                    {showErrors && !isNameValid && (
                        <p className="text-xs mt-1" style={{ color: "#FF3B30" }}>Category name is required</p>
                    )}
                </div>

                <ColorPicker value={selectedColor} onChange={setSelectedColor} />

                <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
            </div>
        </PopinWrapper>
    );
}