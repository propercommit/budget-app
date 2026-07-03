"use client";

import { Loader2, Lock } from "lucide-react";
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
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md lg:max-w-lg xl:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-10 sm:h-10 bg-muted rounded-xl flex items-center justify-center">
                            <Lock className="w-6 h-6 sm:w-5 sm:h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">Change Password</DialogTitle>
                            <DialogDescription>Keep your account secure</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
                            Current Password
                        </Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => onCurrentPasswordChange(e.target.value)}
                            placeholder="Enter current password"
                            className="h-12 text-base rounded-xl"
                            autoComplete="current-password"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                            New Password
                        </Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => onNewPasswordChange(e.target.value)}
                            placeholder="Enter new password"
                            className="h-12 text-base rounded-xl"
                            autoComplete="new-password"
                        />
                        <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmNewPassword" className="text-sm font-medium text-foreground">
                            Confirm New Password
                        </Label>
                        <Input
                            id="confirmNewPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => onConfirmPasswordChange(e.target.value)}
                            placeholder="Confirm new password"
                            className="h-12 text-base rounded-xl"
                            autoComplete="new-password"
                        />
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
                            "Update Password"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}