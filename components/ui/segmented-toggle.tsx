"use client";

/**
 * One choice in a {@link SegmentedToggle}. The dot renders in `dotColor` at
 * full opacity when selected and fades when not, matching the income popin's
 * original active/passive toggle it was extracted from.
 */
export interface SegmentedToggleOption<T extends string> {
    value: T;
    label: string;
    dotColor: string;
}

/**
 * Deliberately a two-option tuple: the sliding-pill geometry below assumes
 * exactly two segments (50% pill width, 0%/100% translate). Generalising to
 * N options is out of scope until a third use exists.
 */
export interface SegmentedToggleProps<T extends string> {
    options: [SegmentedToggleOption<T>, SegmentedToggleOption<T>];
    value: T;
    onChange: (value: T) => void;
}

/**
 * Two-option segmented control with a sliding pill on a muted track — the
 * toggle formerly inlined in the income popin, extracted so the spending
 * entry popin can reuse it. Controlled: selection lives in the
 * caller; clicking a segment reports its `value` via `onChange`.
 */
export function SegmentedToggle<T extends string>({ options, value, onChange }: SegmentedToggleProps<T>) {

    return (
        <div className="relative flex rounded-xl p-1 bg-muted">
            <div
                className="absolute top-1 bottom-1 rounded-lg bg-background shadow-sm transition-transform duration-200 ease-out"
                style={{
                    width: "calc(50% - 4px)",
                    left: "4px",
                    transform: value === options[1].value ? "translateX(100%)" : "translateX(0)",
                }}
            />
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`relative flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 z-10 ${value === option.value ? "text-foreground" : "text-muted-foreground"}`}
                >
                    <div
                        className="w-2.5 h-2.5 rounded-full transition-opacity duration-200"
                        style={{ backgroundColor: option.dotColor, opacity: value === option.value ? 1 : 0.35 }}
                    />
                    {option.label}
                </button>
            ))}
        </div>
    );
}
