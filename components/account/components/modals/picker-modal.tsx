"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { InsetDivider } from "../inset-divider";
import { SheetModal, SheetGroup } from "./sheet-modal";

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
            <SheetGroup>
                {options.map((option, index) => (
                    <Fragment key={option.value}>
                        {index > 0 && <InsetDivider />}
                        <button
                            type="button"
                            role="option"
                            aria-selected={option.value === selected}
                            onClick={() => {
                                onSelect(option.value);
                                onClose();
                            }}
                            className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-muted/50 active:bg-muted sm:text-[15px]"
                        >
                            {option.label}
                            <Check
                                strokeWidth={2.6}
                                className={`h-5 w-5 flex-none text-primary ${option.value === selected ? "opacity-100" : "opacity-0"}`}
                            />
                        </button>
                    </Fragment>
                ))}
            </SheetGroup>
        </SheetModal>
    );
}
