"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
    firstName: string;
    lastName: string;
    hasChanges: boolean;
    isSaving: boolean;
    onFirstNameChange: (value: string) => void;
    onLastNameChange: (value: string) => void;
    onSave: () => void;
}

export function ProfileForm({
    firstName,
    lastName,
    hasChanges,
    isSaving,
    onFirstNameChange,
    onLastNameChange,
    onSave,
}: ProfileFormProps) {
    return (
        <>
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label
                            htmlFor="firstName"
                            className="text-sm font-medium text-gray-700"
                        >
                            First Name
                        </Label>
                        <Input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e) => onFirstNameChange(e.target.value)}
                            className="h-12 text-base rounded-xl"
                            placeholder="John"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label
                            htmlFor="lastName"
                            className="text-sm font-medium text-gray-700"
                        >
                            Last Name
                        </Label>
                        <Input
                            id="lastName"
                            type="text"
                            value={lastName}
                            onChange={(e) => onLastNameChange(e.target.value)}
                            className="h-12 text-base rounded-xl"
                            placeholder="Doe"
                        />
                    </div>
                </div>
            </div>

            <Button
                onClick={onSave}
                disabled={!hasChanges || isSaving}
                className={`w-full mt-6 h-12 text-base font-medium rounded-xl transition-colors touch-manipulation ${
                    hasChanges
                        ? "bg-green-500 hover:bg-green-600 active:bg-green-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
            >
                {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    "Save Changes"
                )}
            </Button>
        </>
    );
}