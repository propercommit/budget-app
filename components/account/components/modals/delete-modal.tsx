"use client";

import { InsetDivider } from "../inset-divider";
import { SheetModal, SheetGroup, SheetInput, SheetFootnote } from "./sheet-modal";
import { FormBanner } from "@/components/ui/form-banner";

/**
 * The exact text a user must type to arm account deletion — shared with the
 * page's submit guard so the UI gate and the handler can't drift apart.
 */
export const DELETE_CONFIRMATION = "DELETE";

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

    const canDelete = confirmText === DELETE_CONFIRMATION;

    return (
        <SheetModal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Account"
            action={{ label: "Delete", onClick: onSubmit, disabled: !canDelete, isSaving, destructive: true }}
        >
            {/* A consequence warning, not an error — warning variant per the
                validation system ("success/warnings never wear error clothes"). */}
            <FormBanner variant="warning">
                Deleting your account permanently removes all spending records, categories and budgets, income
                sources, uploaded receipts, and your profile.
            </FormBanner>

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
                        <InsetDivider />
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

            {error !== null && <FormBanner variant="error">{error}</FormBanner>}

            <SheetFootnote>The Delete button activates once you type DELETE.</SheetFootnote>
        </SheetModal>
    );
}
