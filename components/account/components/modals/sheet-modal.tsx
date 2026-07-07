"use client";

import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Header action rendered on the right side of a {@link SheetModal} header
 * (e.g. "Send", "Update", "Delete"). While `isSaving` the label is replaced
 * by a spinner and the button is disabled.
 */
export interface SheetAction {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    isSaving?: boolean;
    /** Renders the enabled action in red instead of green (delete flows). */
    destructive?: boolean;
}

interface SheetContentProps {
    children: React.ReactNode;
    /** Desktop sheet width: "sm" for pickers/confirms, "md" for form sheets. */
    size?: "sm" | "md";
    className?: string;
}

/**
 * Positioning shell shared by the account sheets: a bottom sheet with a drag
 * handle on mobile, a centered dialog on ≥sm. Background and inner padding
 * are the caller's job (via className/children) so both grouped sheets and
 * plain confirm cards can use it.
 */
export function SheetContent({ children, size = "md", className }: SheetContentProps) {

    return (
        <DialogContent
            showCloseButton={false}
            aria-describedby={undefined}
            className={cn(
                "block gap-0 border-0 p-0 shadow-2xl",
                "top-auto bottom-2 left-2 right-2 w-auto max-w-none translate-x-0 translate-y-0 rounded-2xl",
                "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:right-auto sm:w-full sm:translate-x-[-50%] sm:translate-y-[-50%]",
                size === "sm" ? "sm:max-w-[360px]" : "sm:max-w-[430px]",
                "max-h-[calc(100svh-1rem)] overflow-y-auto sm:max-h-[90svh]",
                className
            )}
        >
            <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-muted-foreground/25 sm:hidden" />
            {children}
        </DialogContent>
    );
}

interface SheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    /** Omitted for pickers, which commit on row tap instead. */
    action?: SheetAction;
    size?: "sm" | "md";
    children: React.ReactNode;
}

/**
 * iOS-settings-style sheet used by the account modals: a `Cancel | title |
 * action` header over grouped content. Cancel always closes; the action
 * button is the modal's submit.
 */
export function SheetModal({ isOpen, onClose, title, action, size = "md", children }: SheetModalProps) {

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent size={size} className="bg-muted dark:bg-background">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pt-2.5 pb-2 sm:px-[18px] sm:pt-3.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="justify-self-start p-1 text-base text-green-600 transition-opacity hover:opacity-70 sm:text-[15px]"
                    >
                        Cancel
                    </button>
                    <DialogTitle className="text-base font-semibold text-foreground sm:text-[15px]">{title}</DialogTitle>
                    {action !== undefined ? (
                        <button
                            type="button"
                            onClick={action.onClick}
                            disabled={action.disabled === true || action.isSaving === true}
                            className={cn(
                                "justify-self-end p-1 text-base font-bold transition-opacity sm:text-[15px]",
                                action.destructive === true ? "text-red-500" : "text-green-600",
                                action.disabled === true
                                    ? "cursor-not-allowed text-muted-foreground/60"
                                    : "hover:opacity-70"
                            )}
                        >
                            {action.isSaving === true ? <Loader2 className="h-4 w-4 animate-spin" /> : action.label}
                        </button>
                    ) : (
                        <div />
                    )}
                </div>
                <div className="flex flex-col gap-2 px-4 pt-1 pb-6 sm:px-[18px] sm:pb-[22px]">{children}</div>
            </SheetContent>
        </Dialog>
    );
}

/** Grouped card holding {@link SheetInput} rows separated by `InsetDivider`s. */
export function SheetGroup({ children }: { children: React.ReactNode }) {

    return <div className="overflow-hidden rounded-xl bg-card">{children}</div>;
}

/**
 * Borderless input row for a {@link SheetGroup}. Mobile keeps 16px text so
 * iOS Safari doesn't zoom the sheet on focus.
 */
export function SheetInput({ className, ...props }: React.ComponentProps<"input">) {

    return (
        <input
            className={cn(
                "block h-12 w-full bg-transparent px-4 text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-[15px]",
                className
            )}
            {...props}
        />
    );
}

/** Caption line under a sheet group — hints, and errors with tone="destructive". */
export function SheetFootnote({
    children,
    tone = "muted",
}: {
    children: React.ReactNode;
    tone?: "muted" | "destructive";
}) {

    return (
        <p
            role={tone === "destructive" ? "alert" : undefined}
            className={cn(
                "px-4 text-[13px] leading-normal",
                tone === "destructive" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            )}
        >
            {children}
        </p>
    );
}
