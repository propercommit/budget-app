"use client";

import { SheetModal, SheetGroup, SheetDivider, SheetInput, SheetFootnote } from "./sheet-modal";

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    confirmText: string;
    password: string;
    error: string | null;
    isSaving: boolean;
    isGoogleUser?: boolean;
    onConfirmTextChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onSubmit: () => void;
}

/**
 * Delete-account sheet. The header "Delete" action stays disabled until the
 * exact confirmation text is typed (matching the page handler's check);
 * Google users skip the password field since they have none to re-enter.
 */
export function DeleteModal({
    isOpen,
    onClose,
    confirmText,
    password,
    error,
    isSaving,
    isGoogleUser = false,
    onConfirmTextChange,
    onPasswordChange,
    onSubmit,
}: DeleteModalProps) {

    const canDelete = confirmText === "DELETE";

    return (
        <SheetModal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Account"
            action={{ label: "Delete", onClick: onSubmit, disabled: !canDelete, isSaving, destructive: true }}
        >
            <SheetFootnote tone="destructive">
                Deleting your account permanently removes all spending records, categories and budgets, income
                sources, uploaded receipts, and your profile.
            </SheetFootnote>

            <SheetGroup>
                <SheetInput
                    type="text"
                    placeholder="Type DELETE to confirm"
                    value={confirmText}
                    onChange={(e) => onConfirmTextChange(e.target.value)}
                    autoComplete="off"
                />
                {!isGoogleUser && (
                    <>
                        <SheetDivider />
                        <SheetInput
                            type="password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => onPasswordChange(e.target.value)}
                            autoComplete="current-password"
                        />
                    </>
                )}
            </SheetGroup>

            {error !== null && <SheetFootnote tone="destructive">{error}</SheetFootnote>}

            <SheetFootnote>The Delete button activates once you type DELETE.</SheetFootnote>
        </SheetModal>
    );
}
