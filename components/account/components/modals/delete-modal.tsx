"use client";

import { Loader2, AlertTriangle } from "lucide-react";
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
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-10 sm:h-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">Delete Account</DialogTitle>
                            <DialogDescription>This action is permanent</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm text-red-800 font-medium">
                            Warning: This will permanently delete:
                        </p>
                        <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                            <li>All spending records</li>
                            <li>All categories and budgets</li>
                            <li>All income sources</li>
                            <li>All uploaded receipts</li>
                            <li>Your profile information</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="deleteConfirm" className="text-sm font-medium text-gray-700">
                            Type &quot;DELETE&quot; to confirm
                        </Label>
                        <Input
                            id="deleteConfirm"
                            type="text"
                            value={confirmText}
                            onChange={(e) => onConfirmTextChange(e.target.value)}
                            placeholder="DELETE"
                            className="h-12 text-base rounded-xl"
                            autoComplete="off"
                        />
                    </div>

                    {!isGoogleUser && (
                        <div className="space-y-2">
                            <Label htmlFor="deletePassword" className="text-sm font-medium text-gray-700">
                                Enter your password
                            </Label>
                            <Input
                                id="deletePassword"
                                type="password"
                                value={password}
                                onChange={(e) => onPasswordChange(e.target.value)}
                                placeholder="Enter password to confirm"
                                className="h-12 text-base rounded-xl"
                                autoComplete="current-password"
                            />
                        </div>
                    )}

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
                        className="h-12 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl flex-1 touch-manipulation"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            "Delete Forever"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}