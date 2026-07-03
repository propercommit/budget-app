"use client";

import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    isSaving: boolean;
    onSubmit: () => void;
}

export function LogoutModal({
    isOpen,
    onClose,
    isSaving,
    onSubmit,
}: LogoutModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-sm rounded-t-3xl sm:rounded-2xl">
                <div className="text-center py-4">
                    <div className="w-16 h-16 sm:w-12 sm:h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogOut className="w-8 h-8 sm:w-6 sm:h-6 text-muted-foreground" />
                    </div>
                    <DialogTitle className="text-xl sm:text-lg font-semibold text-foreground mb-2">
                        Logout
                    </DialogTitle>
                    <DialogDescription className="text-base sm:text-sm text-muted-foreground">
                        Are you sure you want to logout?
                    </DialogDescription>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="h-12 rounded-xl touch-manipulation"
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onSubmit}
                        className="h-12 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground rounded-xl flex-1 touch-manipulation"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            "Logout"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}