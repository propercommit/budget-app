"use client";

import { ChevronRight } from "lucide-react";

/** Uppercase caption over a grouped card — the v2 page's section container. */
export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {

    return (
        <section className="flex flex-col gap-2">
            <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">{children}</div>
        </section>
    );
}

/** Inset hairline between the rows of a {@link SettingsSection} card. */
export function SettingsRowDivider() {

    return <div className="ml-4 h-px bg-border sm:ml-5" />;
}

interface SettingsRowProps {
    label: string;
    /** Right-aligned current value (e.g. the email address, "USD ($)"). */
    detail?: string;
    /** Secondary line under the label (e.g. the export row's explainer). */
    description?: string;
    /** Custom trailing adornment; defaults to a disclosure chevron. */
    trailing?: React.ReactNode;
    onClick?: () => void;
}

/**
 * Tappable list row inside a {@link SettingsSection}: label on the left, the
 * current value right-aligned, disclosure chevron (or custom trailing node)
 * at the edge.
 */
export function SettingsRow({ label, detail, description, trailing, onClick }: SettingsRowProps) {

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-h-12 w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted sm:px-5"
        >
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
        </button>
    );
}
