"use client";

import { InsetDivider } from "../inset-divider";
import { SheetModal, SheetGroup, SheetInput, SheetFootnote } from "./sheet-modal";
import { FormBanner } from "@/components/ui/form-banner";

interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentEmail: string;
    newEmail: string;
    password: string;
    error: string | null;
    isSaving: boolean;
    onNewEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onSubmit: () => void;
}

/** Change-email sheet: current address, new address, password re-auth. */
export function EmailModal({
    isOpen,
    onClose,
    currentEmail,
    newEmail,
    password,
    error,
    isSaving,
    onNewEmailChange,
    onPasswordChange,
    onSubmit,
}: EmailModalProps) {

    return (
        <SheetModal
            isOpen={isOpen}
            onClose={onClose}
            title="Change Email"
            action={{ label: "Send", onClick: onSubmit, isSaving }}
        >
            <SheetGroup>
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <span className="flex-none text-base text-foreground sm:text-[15px]">Current</span>
                    <span className="truncate text-[15px] text-muted-foreground">{currentEmail}</span>
                </div>
                <InsetDivider />
                <SheetInput
                    type="email"
                    placeholder="New email address"
                    value={newEmail}
                    onChange={(e) => onNewEmailChange(e.target.value)}
                    autoComplete="email"
                />
                <InsetDivider />
                <SheetInput
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    autoComplete="current-password"
                />
            </SheetGroup>

            {error !== null && <FormBanner variant="error">{error}</FormBanner>}

            <SheetFootnote>
                We&apos;ll send verification links to both addresses. Confirm your current email first, then the new
                one.
            </SheetFootnote>
        </SheetModal>
    );
}
