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

/**
 * Name fields inside the Profile section card. Save stays disabled until a
 * field actually differs from its loaded value; full-width on mobile,
 * right-aligned pill on ≥sm.
 */
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
        <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstName" className="text-[13px] font-semibold text-foreground/70">
                        First Name
                    </Label>
                    <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => onFirstNameChange(e.target.value)}
                        className="h-11 rounded-[10px] text-base sm:text-[15px]"
                        placeholder="John"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastName" className="text-[13px] font-semibold text-foreground/70">
                        Last Name
                    </Label>
                    <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => onLastNameChange(e.target.value)}
                        className="h-11 rounded-[10px] text-base sm:text-[15px]"
                        placeholder="Doe"
                    />
                </div>
            </div>

            <div className="flex sm:justify-end">
                <Button
                    onClick={onSave}
                    disabled={!hasChanges || isSaving}
                    className={`h-11 w-full rounded-full px-6 text-[15px] font-semibold transition-colors sm:w-auto ${
                        hasChanges
                            ? "bg-green-500 text-white hover:bg-green-600 active:bg-green-700"
                            : "bg-muted text-muted-foreground/70"
                    }`}
                >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save"}
                </Button>
            </div>
        </div>
    );
}
