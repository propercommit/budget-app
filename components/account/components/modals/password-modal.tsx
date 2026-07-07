"use client";

import { InsetDivider } from "../inset-divider";
import { SheetModal, SheetGroup, SheetInput, SheetFootnote } from "./sheet-modal";
import { FieldMessage } from "@/components/ui/field-message";
import { FormBanner } from "@/components/ui/form-banner";

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    /** Whole-form / server feedback, rendered as an error banner. */
    error: string | null;
    /** Field message under the new-password input (e.g. too short). */
    newPasswordError: string | null;
    /** Field message under the confirm input (passwords don't match). */
    confirmPasswordError: string | null;
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
    newPasswordError,
    confirmPasswordError,
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
                    aria-invalid={newPasswordError !== null ? true : undefined}
                    aria-describedby={newPasswordError !== null ? "newPassword-error" : undefined}
                />
                {newPasswordError !== null && (
                    <div className="px-4 pb-3">
                        <FieldMessage id="newPassword-error">{newPasswordError}</FieldMessage>
                    </div>
                )}
                <InsetDivider />
                <SheetInput
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                    autoComplete="new-password"
                    aria-invalid={confirmPasswordError !== null ? true : undefined}
                    aria-describedby={confirmPasswordError !== null ? "confirmNewPassword-error" : undefined}
                />
                {confirmPasswordError !== null && (
                    <div className="px-4 pb-3">
                        <FieldMessage id="confirmNewPassword-error">{confirmPasswordError}</FieldMessage>
                    </div>
                )}
            </SheetGroup>

            {error !== null && <FormBanner variant="error">{error}</FormBanner>}

            {/* Replaced by the field message while the length rule is failing. */}
            {newPasswordError === null && (
                <SheetFootnote>Your new password must be at least 8 characters.</SheetFootnote>
            )}
        </SheetModal>
    );
}
