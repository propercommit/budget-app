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
    onAddEntry: (entry: { name: string; amount: number; receiptUrl?: string; link?: string }) => void;
    onUpdateEntry: (entryId: string, data: { name?: string; amount?: number; receiptUrl?: string; link?: string }) => void;
    onDeleteEntry: (entryId: string) => void;
    mode: "create" | "edit";
    editingEntry: SpendingEntry | null;
}

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

    const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
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
    };

    const handleSubmit = () => {
        if (name.trim() === "" || amount === "") return;

        const entryData = {
            name: name.trim(),
            amount: parseFloat(amount),
            link: link.trim() || undefined,
            receiptUrl: receiptUrl || undefined,
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
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="entry-amount">Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                                id="entry-amount"
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-7"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="entry-link">Link (optional)</Label>
                        <Input
                            id="entry-link"
                            type="url"
                            placeholder="https://..."
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Receipt (optional)</Label>
                        {receiptUrl ? (
                            <div className="relative">
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
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                                <Upload className="w-6 h-6 text-gray-400" />
                                <span className="text-sm text-gray-500 mt-1">Upload receipt</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleReceiptUpload}
                                    className="hidden"
                                />
                            </label>
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