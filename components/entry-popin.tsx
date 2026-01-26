"use client"
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpendingEntry } from "@/lib/types";
import { Upload, X } from "lucide-react";

interface EntryPopinProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddEntry: (entry: { name: string; amount: number; receiptUrl?: string; link?: string, date?: string }) => void;
    onUpdateEntry: (entryId: string, data: { name?: string; amount?: number; receiptUrl?: string; link?: string, date?: string }) => void;
    onDeleteEntry: (entryId: string) => void;
    mode: "create" | "edit";
    editingEntry: SpendingEntry | null;
}

interface ValidationErrors {
    name?: string;
    amount?: string;
    link?: string;
    receipt?: string;
}

const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT = 1000000;
const MAX_RECEIPT_SIZE_MB = 2;

export function EntryPopin({
    isOpen,
    onOpenChange,
    onAddEntry,
    onUpdateEntry,
    onDeleteEntry,
    mode,
    editingEntry,
}: EntryPopinProps) {
    const [name, setName] = useState(editingEntry?.name ?? "");
    const [amount, setAmount] = useState(editingEntry?.amount.toString() ?? "");
    const [link, setLink] = useState(editingEntry?.link ?? "");
    const [receiptUrl, setReceiptUrl] = useState(editingEntry?.receiptUrl ?? "");
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [entryDate, setEntryDate] = useState(
        editingEntry?.date 
            ? new Date(editingEntry.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );

    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {};

        // Validate name
        const trimmedName = name.trim();
        if (trimmedName === "") {
            newErrors.name = "Name is required";
        } else if (trimmedName.length > MAX_NAME_LENGTH) {
            newErrors.name = `Name must be ${MAX_NAME_LENGTH} characters or less`;
        }

        // Validate amount
        if (amount === "") {
            newErrors.amount = "Amount is required";
        } else {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount)) {
                newErrors.amount = "Amount must be a valid number";
            } else if (numAmount < 0) {
                newErrors.amount = "Amount cannot be negative";
            } else if (numAmount > MAX_AMOUNT) {
                newErrors.amount = `Amount cannot exceed $${MAX_AMOUNT.toLocaleString()}`;
            }
        }

        // Validate link (optional)
        if (link.trim() !== "") {
            try {
                new URL(link.trim());
            } catch {
                newErrors.link = "Please enter a valid URL (e.g., https://example.com)";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Check file size
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > MAX_RECEIPT_SIZE_MB) {
                setErrors(prev => ({ 
                    ...prev, 
                    receipt: `Receipt must be smaller than ${MAX_RECEIPT_SIZE_MB}MB` 
                }));
                return;
            }

            // Clear any previous receipt error
            setErrors(prev => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { receipt, ...rest } = prev;
                return rest;
            });

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setReceiptUrl(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveReceipt = () => {
        setReceiptUrl("");
        setErrors(prev => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { receipt, ...rest } = prev;
            return rest;
        });
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        const entryData = {
            name: name.trim(),
            amount: parseFloat(amount),
            link: link.trim() || undefined,
            receiptUrl: receiptUrl || undefined,
            date: entryDate
        };

        if (mode === "edit" && editingEntry !== null) {
            onUpdateEntry(editingEntry.id, entryData);
        } else {
            onAddEntry(entryData);
        }

        onOpenChange(false);
    };

    const handleDelete = () => {
        if (editingEntry !== null) {
            onDeleteEntry(editingEntry.id);
            onOpenChange(false);
        }
    };

    // Clear field error when user starts typing
    const handleNameChange = (value: string) => {
        setName(value);
        if (errors.name) {
            setErrors(prev => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { name, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleAmountChange = (value: string) => {
        setAmount(value);
        if (errors.amount) {
            setErrors(prev => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { amount, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleLinkChange = (value: string) => {
        setLink(value);
        if (errors.link) {
            setErrors(prev => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { link, ...rest } = prev;
                return rest;
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "edit" ? "Edit Entry" : "Add Entry"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "edit" 
                            ? "Update the details of this spending entry" 
                            : "Add a new spending entry to track your expenses"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="entry-name">Name</Label>
                        <Input
                            id="entry-name"
                            placeholder="e.g., Weekly grocery shopping"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            maxLength={MAX_NAME_LENGTH}
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="entry-amount">Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                                id="entry-amount"
                                type="number"
                                min={0}
                                max={MAX_AMOUNT}
                                step={0.01}
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                className={`pl-7 ${errors.amount ? "border-red-500" : ""}`}
                            />
                        </div>
                        {errors.amount && (
                            <p className="text-sm text-red-500">{errors.amount}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}></Input> 
                    </div>

                    <div className="space-y-2">
                        <Label>Receipt (optional)</Label>
                        {receiptUrl ? (
                            <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={receiptUrl} 
                                    alt="Receipt" 
                                    className="w-full h-32 object-cover rounded-lg border"
                                />
                                <button
                                    onClick={handleRemoveReceipt}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                errors.receipt 
                                    ? "border-red-500 bg-red-50" 
                                    : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                            }`}>
                                <Upload className={`w-6 h-6 ${errors.receipt ? "text-red-400" : "text-gray-400"}`} />
                                <span className={`text-sm mt-1 ${errors.receipt ? "text-red-500" : "text-gray-500"}`}>
                                    Upload receipt (max {MAX_RECEIPT_SIZE_MB}MB)
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleReceiptUpload}
                                    className="hidden"
                                />
                            </label>
                        )}
                        {errors.receipt && (
                            <p className="text-sm text-red-500">{errors.receipt}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="entry-link">Link (optional)</Label>
                        <Input
                            id="entry-link"
                            type="url"
                            placeholder="https://..."
                            value={link}
                            onChange={(e) => handleLinkChange(e.target.value)}
                            className={errors.link ? "border-red-500" : ""}
                        />
                        {errors.link && (
                            <p className="text-sm text-red-500">{errors.link}</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                    {mode === "edit" && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="w-full sm:w-auto"
                        >
                            Delete
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit}
                        className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
                    >
                        {mode === "edit" ? "Save Changes" : "Add Entry"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}