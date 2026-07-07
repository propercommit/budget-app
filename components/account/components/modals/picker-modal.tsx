"use client";

import { Check } from "lucide-react";
import { SheetModal } from "./sheet-modal";

export interface PickerOption<T extends string> {
    value: T;
    label: string;
}

interface PickerModalProps<T extends string> {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    options: readonly PickerOption<T>[];
    selected: T;
    onSelect: (value: T) => void;
}

/**
 * Single-select list sheet used by the currency and date-format preferences.
 * Tapping a row reports it via `onSelect` and closes — there is no separate
 * confirm action, matching the iOS picker pattern.
 */
export function PickerModal<T extends string>({
    isOpen,
    onClose,
    title,
    options,
    selected,
    onSelect,
}: PickerModalProps<T>) {

    return (
        <SheetModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="overflow-hidden rounded-xl bg-card">
                {options.map((option, index) => (
                    <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === selected}
                        onClick={() => {
                            onSelect(option.value);
                            onClose();
                        }}
                        className={`flex min-h-12 w-full items-center justify-between px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-muted/50 active:bg-muted sm:text-[15px] ${
                            index > 0 ? "border-t border-border" : ""
                        }`}
                    >
                        {option.label}
                        <Check
                            strokeWidth={2.6}
                            className={`h-5 w-5 flex-none text-green-500 ${option.value === selected ? "opacity-100" : "opacity-0"}`}
                        />
                    </button>
                ))}
            </div>
        </SheetModal>
    );
}
