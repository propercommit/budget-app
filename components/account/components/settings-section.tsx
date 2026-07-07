"use client";

import { ChevronRight } from "lucide-react";

/**
 * Grouped card with an optional uppercase caption — the v2 page's section
 * container. Captionless sections (e.g. the Log Out card) share the same
 * shell so the card styling can't drift.
 */
export function SettingsSection({ title, children }: { title?: string; children: React.ReactNode }) {

    return (
        <section className="flex flex-col gap-2">
            {title !== undefined && (
                <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {title}
                </h2>
            )}
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">{children}</div>
        </section>
    );
}

interface SettingsRowProps {
    label: string;
    /** Right-aligned current value (e.g. the email address, "USD ($)"). */
    detail?: string;
    /** Secondary line under the label (e.g. the export row's explainer). */
    description?: string;
    /** Custom trailing adornment; defaults to a disclosure chevron. */
    trailing?: React.ReactNode;
    /** Omit for a non-interactive row: it renders as a plain div with no hover affordance. */
    onClick?: () => void;
}

/**
 * List row inside a {@link SettingsSection}: label on the left, the current
 * value right-aligned, disclosure chevron (or custom trailing node) at the
 * edge. Rows wrap, so a full-width trailing control (like the appearance
 * toggle) stacks under the label on mobile.
 */
export function SettingsRow({ label, detail, description, trailing, onClick }: SettingsRowProps) {

    const rowClasses = "flex min-h-12 w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left sm:px-5";

    const content = (
        <>
            <span className={`min-w-0 ${detail === undefined ? "flex-1" : "flex-none"}`}>
                <span className="block text-base font-medium text-foreground sm:text-[15px]">{label}</span>
                {description !== undefined && (
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">{description}</span>
                )}
            </span>
            {detail !== undefined && (
                <span className="min-w-0 flex-1 truncate text-right text-[15px] text-muted-foreground">{detail}</span>
            )}
            {trailing !== undefined ? (
                trailing
            ) : (
                <ChevronRight className="h-4 w-4 flex-none text-muted-foreground/50" strokeWidth={2.4} />
            )}
        </>
    );

    if (onClick === undefined) return <div className={rowClasses}>{content}</div>;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${rowClasses} transition-colors hover:bg-muted/50 active:bg-muted`}
        >
            {content}
        </button>
    );
}
