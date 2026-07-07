"use client";

import { CSSProperties, FocusEvent, ReactNode, RefObject } from "react";

/**
 * Inline field-level validation message — one of the three surfaces of the
 * unified validation system (field message / form banner / toast).
 *
 * Rendered directly under the errored input (6px gap), replacing any helper
 * text while active — never stacked with it. The associated input must carry
 * `aria-invalid` and `aria-describedby` pointing at this element's `id`
 * (see {@link fieldValidationProps}).
 */

type ValidationElement = HTMLInputElement | HTMLTextAreaElement;

/** 13px filled error circle with a white exclamation mark, per the validation spec. */
function FieldErrorIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#FF3B30" className="flex-shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <rect x="11" y="6" width="2" height="8" rx="1" fill="white" />
            <circle cx="12" cy="17" r="1.3" fill="white" />
        </svg>
    );
}

interface FieldMessageProps {
    /** Referenced by the errored input's `aria-describedby`. */
    id: string;
    children: ReactNode;
}

export function FieldMessage({ id, children }: FieldMessageProps) {
    return (
        <div id={id} className="flex items-center" style={{ gap: 5, marginTop: 6 }}>
            <FieldErrorIcon />
            <p className="m-0 font-medium" style={{ fontSize: 13, color: "#FF3B30" }}>{children}</p>
        </div>
    );
}

/**
 * Input styling for the two validation states. Errored: red border, tinted
 * fill and a soft red ring; valid: the app's standard muted input. Spread the
 * result into the input's `style` (before any extra per-input properties).
 */
export function fieldInputStyle(hasError: boolean): CSSProperties {
    return hasError
        ? {
              backgroundColor: "var(--validation-error-fill)",
              border: "1px solid #FF3B30",
              boxShadow: "0 0 0 3px rgba(255, 59, 48, 0.08)",
          }
        : { backgroundColor: "var(--muted)", border: "1px solid var(--border)" };
}

/**
 * Accessibility wiring plus focus handlers for a validated input. The blue
 * focus treatment applies only while the field is valid — focus while errored
 * keeps the red border, per the validation spec.
 */
export function fieldValidationProps(hasError: boolean, messageId: string) {
    return {
        "aria-invalid": hasError === true ? true : undefined,
        "aria-describedby": hasError === true ? messageId : undefined,
        onFocus: (e: FocusEvent<ValidationElement>) => {
            if (hasError) return;

            e.currentTarget.style.borderColor = "#007AFF";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)";
        },
        onBlur: (e: FocusEvent<ValidationElement>) => {
            if (hasError) return;

            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
        },
    };
}

/**
 * Field-message copy for an invalid amount/budget input, per the validation
 * spec's copy table: an empty or zero amount asks for one, anything else that
 * failed to parse (e.g. a trailing dot) shows the format example. Call only
 * when the value already failed `parseAmountToCents`.
 */
export function amountFieldMessage(raw: string): string {

    const trimmed = raw.trim();

    return trimmed === "" || /^0*\.?0*$/.test(trimmed)
        ? "Enter an amount"
        : "Enter a valid amount, like 2500 or 49.90";
}

/**
 * Focuses the first errored field on a failed submit and scrolls it into the
 * popin's visible area. Pass fields in visual order with their *current*
 * validity (not the submitted-gated one, which is still false during the
 * failing click's render).
 */
export function focusFirstInvalid(fields: Array<{ error: boolean; ref: RefObject<HTMLElement | null> }>): void {

    const first = fields.find((f) => f.error === true);

    if (first === undefined) return;

    const el = first.ref.current;

    if (el === null) return;

    el.focus();

    el.scrollIntoView?.({ block: "center", behavior: "smooth" });
}
