"use client";

import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md lg:max-w-lg xl:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-10 sm:h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Mail className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">Change Email</DialogTitle>
                            <DialogDescription>We&apos;ll send a verification link</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentEmail" className="text-sm font-medium text-foreground">
                            Current Email
                        </Label>
                        <Input
                            id="currentEmail"
                            type="email"
                            value={currentEmail}
                            disabled
                            className="h-12 text-base bg-muted rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newEmail" className="text-sm font-medium text-foreground">
                            New Email
                        </Label>
                        <Input
                            id="newEmail"
                            type="email"
                            value={newEmail}
                            onChange={(e) => onNewEmailChange(e.target.value)}
                            placeholder="Enter new email address"
                            className="h-12 text-base rounded-xl"
                            autoComplete="email"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emailPassword" className="text-sm font-medium text-foreground">
                            Confirm Password
                        </Label>
                        <Input
                            id="emailPassword"
                            type="password"
                            value={password}
                            onChange={(e) => onPasswordChange(e.target.value)}
                            placeholder="Enter your password to confirm"
                            className="h-12 text-base rounded-xl"
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700">
                        <p>Verification links will be sent to both your current and new email addresses.</p>
                        <p className="mt-2">1) Click the link in your <strong>current email first</strong></p>
                        <p>2) then the link in your <strong>new email</strong></p>
                    </div>

                    {error && (
                        <div className="bg-red-50 p-4 rounded-xl text-sm text-red-700">
                            {error}
                        </div>
                    )}
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
                        className="h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-xl flex-1 touch-manipulation"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            "Send Verification"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}