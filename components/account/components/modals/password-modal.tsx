"use client";

import { InsetDivider } from "../inset-divider";
import { SheetModal, SheetGroup, SheetInput, SheetFootnote } from "./sheet-modal";

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    error: string | null;
    isSaving: boolean;
    onCurrentPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onSubmit: () => void;
}

/** Change-password sheet: current password re-auth plus new password twice. */
export function PasswordModal({
    isOpen,
    onClose,
    currentPassword,
    newPassword,
    confirmPassword,
    error,
    isSaving,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSubmit,
}: PasswordModalProps) {

    return (
        <SheetModal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Password"
            action={{ label: "Update", onClick: onSubmit, isSaving }}
        >
            <SheetGroup>
                <SheetInput
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => onCurrentPasswordChange(e.target.value)}
                    autoComplete="current-password"
                />
                <InsetDivider />
                <SheetInput
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => onNewPasswordChange(e.target.value)}
                    autoComplete="new-password"
                />
                <InsetDivider />
                <SheetInput
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                    autoComplete="new-password"
                />
            </SheetGroup>

            {error !== null && <SheetFootnote tone="destructive">{error}</SheetFootnote>}

            <SheetFootnote>Your new password must be at least 8 characters.</SheetFootnote>
        </SheetModal>
    );
}
