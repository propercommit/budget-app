"use client";

import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SheetContent } from "./sheet-modal";

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    isSaving: boolean;
    onSubmit: () => void;
}

/**
 * Logout confirm card: the primary (green) action keeps the session and the
 * quiet red one signs out — deliberately inverted so a reflexive tap on the
 * prominent button is the safe choice.
 */
export function LogoutModal({ isOpen, onClose, isSaving, onSubmit }: LogoutModalProps) {

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent size="sm" className="bg-card">
                <div className="flex flex-col items-center gap-1.5 px-6 pt-5 text-center sm:pt-7">
                    <div className="mb-1.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 dark:bg-primary/15">
                        <LogOut className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-[19px] font-bold tracking-tight text-foreground">
                        Log out?
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                        Your data stays safe. Sign back in any time to pick up where you left off.
                    </DialogDescription>
                </div>
                <div className="flex flex-col gap-2.5 px-5 pt-5 pb-6">
                    <Button
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-[var(--shadow-btn-primary)] hover:bg-primary-hover active:bg-primary-active sm:text-[15px]"
                    >
                        Stay Logged In
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onSubmit}
                        disabled={isSaving}
                        className="h-12 w-full rounded-xl text-base font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive active:bg-destructive/10 sm:text-[15px]"
                    >
                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log Out"}
                    </Button>
                </div>
            </SheetContent>
        </Dialog>
    );
}
