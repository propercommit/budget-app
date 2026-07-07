"use client";

import { ReactNode } from "react";
import { ErrorIcon } from "@/components/ui/field-message";

/**
 * Form-level banner — one of the three surfaces of the unified validation
 * system. Use when the problem spans the whole form or comes from the server
 * (wrong credentials, terms unaccepted, signup confirmation); single-field
 * problems belong to `FieldMessage` instead. Sits directly above the footer
 * buttons, inside the scroll area.
 *
 * One shape, four variants on the HIG palette. Text color comes from a
 * theme token so the on-tint contrast holds in dark mode too.
 */

export type FormBannerVariant = "error" | "warning" | "success" | "info";

interface VariantSpec {
    background: string;
    border: string;
    textColor: string;
    /** Errors interrupt (`alert`); the rest announce politely (`status`). */
    role: "alert" | "status";
    icon: ReactNode;
}

const ICON_STYLE = { flexShrink: 0, marginTop: 1 } as const;

const VARIANTS: Record<FormBannerVariant, VariantSpec> = {
    error: {
        background: "rgba(255, 59, 48, 0.08)",
        border: "1px solid rgba(255, 59, 48, 0.25)",
        textColor: "var(--banner-error-text)",
        role: "alert",
        icon: <ErrorIcon size={16} style={ICON_STYLE} />,
    },
    warning: {
        background: "rgba(255, 149, 0, 0.09)",
        border: "1px solid rgba(255, 149, 0, 0.3)",
        textColor: "var(--banner-warning-text)",
        role: "status",
        icon: (
            <svg style={ICON_STYLE} width="16" height="16" viewBox="0 0 24 24" fill="#FF9500" aria-hidden="true">
                <path d="M12 2 L23 21 H1 Z" />
                <rect x="11" y="9" width="2" height="6" rx="1" fill="white" />
                <circle cx="12" cy="18" r="1.2" fill="white" />
            </svg>
        ),
    },
    success: {
        background: "rgba(52, 199, 89, 0.1)",
        border: "1px solid rgba(52, 199, 89, 0.3)",
        textColor: "var(--banner-success-text)",
        role: "status",
        icon: (
            <svg style={ICON_STYLE} width="16" height="16" viewBox="0 0 24 24" fill="#34C759" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M7 12.5 L10.5 16 L17 9" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    info: {
        background: "rgba(0, 122, 255, 0.08)",
        border: "1px solid rgba(0, 122, 255, 0.25)",
        textColor: "var(--banner-info-text)",
        role: "status",
        icon: (
            <svg style={ICON_STYLE} width="16" height="16" viewBox="0 0 24 24" fill="#007AFF" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <rect x="11" y="10" width="2" height="7" rx="1" fill="white" />
                <circle cx="12" cy="7" r="1.3" fill="white" />
            </svg>
        ),
    },
};

interface FormBannerProps {
    variant: FormBannerVariant;
    children: ReactNode;
}

export function FormBanner({ variant, children }: FormBannerProps) {

    const spec = VARIANTS[variant];

    return (
        <div
            role={spec.role}
            className="flex items-start"
            style={{ gap: 10, background: spec.background, border: spec.border, borderRadius: 12, padding: "12px 14px" }}
        >
            {spec.icon}
            <div className="m-0 font-medium" style={{ fontSize: 14, lineHeight: 1.45, color: spec.textColor }}>{children}</div>
        </div>
    );
}
