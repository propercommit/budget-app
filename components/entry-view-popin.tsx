"use client"
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpendingEntry } from "@/lib/types";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";

interface EntryViewPopinProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    entry: SpendingEntry | null;
    onEdit: () => void;
    onDelete: () => void;
}

function LargeImageOverlay({ 
    src, 
    onClose 
}: { 
    src: string; 
    onClose: () => void;
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    if (!mounted) return null;

    return createPortal(
        <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
            style={{ zIndex: 99999, pointerEvents: "auto" }}
            onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
            }}
        >
            <button
                className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100"
                style={{ zIndex: 100000 }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClose();
                }}
            >
                <X className="w-6 h-6" />
            </button>
            <img
                src={src}
                alt="Receipt"
                className="max-w-full max-h-full object-contain rounded-lg"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                }}
            />
        </div>,
        document.body
    );
}

export function EntryViewPopin({
    isOpen,
    onOpenChange,
    entry,
    onEdit,
    onDelete,
}: EntryViewPopinProps) {
    const [isLargeImageOpen, setIsLargeImageOpen] = useState(false);

    if (entry === null) return null;

    const handleDelete = () => {
        onDelete();
        onOpenChange(false);
    };

    const handleDialogClose = (open: boolean) => {
        if (isLargeImageOpen) return;
        onOpenChange(open);
    };

    const handleCloseLargeImage = () => {
        setIsLargeImageOpen(false);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="w-[95vw] max-w-md">
                    <DialogHeader>
                        <DialogTitle>{entry.name}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50">
                            <span className="text-gray-600">Amount</span>
                            <span className="text-2xl font-bold">${entry.amount.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50">
                            <span className="text-gray-600">Date</span>
                            <span className="font-medium">
                                {new Date(entry.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                        </div>

                        {entry.receiptUrl && (
                            <div className="space-y-2">
                                <span className="text-gray-600">Receipt</span>
                                <img
                                    src={entry.receiptUrl}
                                    alt="Receipt"
                                    className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                                    onClick={() => setIsLargeImageOpen(true)}
                                />
                            </div>
                        )}

                        {entry.link && (
                            <a
                                href={entry.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                                <span className="text-blue-600 font-medium truncate mr-2">
                                    {entry.link}
                                </span>
                                <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            </a>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleDelete}
                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                        <Button
                            onClick={onEdit}
                            className="flex-1 bg-green-500 hover:bg-green-600"
                        >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            
            {isLargeImageOpen && entry.receiptUrl && (
                <LargeImageOverlay 
                    src={entry.receiptUrl} 
                    onClose={handleCloseLargeImage} 
                />
            )}
        </>
    );
}