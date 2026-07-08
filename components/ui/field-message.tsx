"use client";

import { CSSProperties, FocusEvent, ReactNode, RefObject, useState } from "react";
import { invalidAmountReason } from "@/lib/money";

/**
 * Inline field-level validation message — one of the three surfaces of the
 * unified validation system (field message / form banner / toast).
 *
 * Rendered directly under the errored input (6px gap), replacing any helper
 * text while active — never stacked with it. The associated input must carry
 * `aria-invalid` and `aria-describedby` pointing at this element's `id`
 * (see {@link fieldAriaProps}).
 */

type ValidationElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * The spec's filled error circle with a white exclamation mark. Shared by
 * `FieldMessage` (13px) and `FormBanner`'s error variant (16px) so the glyph
 * stays identical by construction.
 */
export function ErrorIcon({ size = 13, style }: { size?: number; style?: CSSProperties }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF3B30" className="flex-shrink-0" style={style} aria-hidden="true">
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
            <ErrorIcon />
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
              color: "var(--foreground)",
          }
        : { backgroundColor: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" };
}

/**
 * Accessibility wiring for a validated input: `aria-invalid` plus
 * `aria-describedby` → the `FieldMessage` id, present only while errored.
 * For inputs styled by classes (e.g. the shadcn `Input`), spread this alone
 * and apply {@link fieldInputStyle} conditionally.
 */
export function fieldAriaProps(hasError: boolean, messageId: string) {
    return {
        "aria-invalid": hasError === true ? true : undefined,
        "aria-describedby": hasError === true ? messageId : undefined,
    };
}

/**
 * Focus handlers for an inline-styled input. The primary focus treatment
 * applies only while the field is valid — focus while errored keeps the red
 * border, per the validation spec. Pass `false` for fields that are never
 * validated.
 */
export function fieldFocusProps(hasError: boolean) {
    return {
        onFocus: (e: FocusEvent<ValidationElement>) => {
            if (hasError) return;

            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow = "var(--shadow-focus-ring)";
        },
        onBlur: (e: FocusEvent<ValidationElement>) => {
            if (hasError) return;

            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
        },
    };
}

/**
 * The full wiring for a validated, inline-styled popin input:
 * {@link fieldAriaProps} + {@link fieldFocusProps}.
 */
export function fieldValidationProps(hasError: boolean, messageId: string) {
    return { ...fieldAriaProps(hasError, messageId), ...fieldFocusProps(hasError) };
}

/**
 * Field-message copy for an invalid amount/budget input, per the validation
 * spec's copy table. The empty-vs-malformed classification lives next to the
 * parser in `lib/money.ts`; call only when the value already failed
 * `parseAmountToCents`.
 */
export function amountFieldMessage(raw: string): string {
    return invalidAmountReason(raw) === "empty"
        ? "Enter an amount"
        : "Enter a valid amount, like 2500 or 49.90";
}

/**
 * One entry per validated field, in visual order. `error` is the field's
 * *current* validity (not the submitted-gated one). `ref` is the element to
 * focus when this field is the first miss; omit it for problems with no
 * focusable field (e.g. a terms checkbox surfaced as a banner).
 */
export interface RevealField {
    error: boolean;
    ref?: RefObject<HTMLElement | null>;
}

function focusFirstInvalid(fields: RevealField[]): void {

    const first = fields.find((f) => f.error === true);

    const el = first?.ref?.current ?? null;

    if (el === null) return;

    el.focus();

    el.scrollIntoView?.({ block: "center", behavior: "smooth" });
}

/**
 * Owns the submit-reveal choreography shared by every form in the validation
 * system: errors stay hidden while typing a fresh form (`submitted` is
 * false), a failed submit reveals them all and focuses the first invalid
 * field, and — because callers derive their error flags as
 * `submitted && <live check>` — each message clears as soon as its field is
 * fixed.
 *
 * Usage: `if (reveal(fields)) return;` at the top of the save handler, with
 * the same ordered field list serving as both the validity check and the
 * focus target. `reset` re-arms a fresh form (e.g. on a mode switch).
 */
export function useSubmitReveal() {

    const [submitted, setSubmitted] = useState(false);

    const reveal = (fields: RevealField[]): boolean => {

        const anyInvalid = fields.some((f) => f.error === true);

        if (anyInvalid) {
            setSubmitted(true);
            focusFirstInvalid(fields);
        }

        return anyInvalid;
    };

    return { submitted, reveal, reset: () => setSubmitted(false) };
}
