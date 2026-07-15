"use client";

import { useRef, useState } from "react";
import { IconPicker } from "@/components/icon-picker";
import { ColorPicker } from "@/components/color-picker";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { Button } from "@/components/ui/button";
import { FieldMessage, fieldInputStyle, fieldValidationProps, useSubmitReveal } from "@/components/ui/field-message";
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
    const { submitted, reveal } = useSubmitReveal();

    const nameRef = useRef<HTMLInputElement>(null);

    const isCreate = mode === "create";

    // Validate on submit, clear on input: the error surfaces only after a
    // failed save and is derived from the live value, so fixing the name
    // clears it immediately.
    const nameInvalid = name.trim() === "";
    const nameError = submitted && nameInvalid;

    const handleSave = () => {
        if (reveal([{ error: nameInvalid, ref: nameRef }])) return;

        // The API persists the trimmed label — emit the same value so client
        // state (snapshots, label filter) never diverges from the server.
        onSave({ name: name.trim(), icon: selectedIcon, color: selectedColor });
    };

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            zIndex={zIndex}
            floatingHeader={
                <div
                    className="inline-flex max-w-full items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold"
                    style={{ backgroundColor: selectedColor, boxShadow: "0 2px 12px rgba(0, 0, 0, 0.12)" }}
                >
                    <span className="inline-flex text-lg">{iconMap[selectedIcon] ?? selectedIcon}</span>
                    <span className="truncate">{name || (isCreate ? "New Category" : "Edit Category")}</span>
                </div>
            }
            footer={
                <div className="space-y-3">
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button className="flex-1" onClick={handleSave}>
                            {isCreate ? "Create Category" : "Save Changes"}
                        </Button>
                    </div>
                    {!isCreate && onDelete !== undefined && (
                        <DeleteConfirmSection
                            label="Delete Category"
                            confirmMessage={CATEGORY_DELETE_WARNING}
                            onDelete={onDelete}
                        />
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-5">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Name
                    </label>
                    <div className="relative">
                        <input
                            ref={nameRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={30}
                            placeholder="e.g., Transport, Food"
                            className="w-full pl-4 pr-16 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                            style={fieldInputStyle(nameError)}
                            {...fieldValidationProps(nameError, "category-name-error")}
                        />
                        {!nameError && (
                            <span
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                                style={{ color: name.length >= 25 ? "#FF9500" : "var(--muted-foreground)" }}
                            >
                                {name.length}/30
                            </span>
                        )}
                    </div>
                    {nameError && <FieldMessage id="category-name-error">Enter a category name</FieldMessage>}
                </div>

                {/* -mt-2 tightens the tab row under the name field to the
                    design's 12px, against the stack's 20px rhythm. */}
                <div className="-mt-2">
                    <IconPicker value={selectedIcon} onChange={setSelectedIcon} variant="grid" />
                </div>

                <ColorPicker value={selectedColor} onChange={setSelectedColor} />
            </div>
        </PopinWrapper>
    );
}
