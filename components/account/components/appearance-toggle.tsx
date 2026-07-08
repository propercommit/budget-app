"use client";

const OPTIONS = [
    { darkMode: false, label: "Light" },
    { darkMode: true, label: "Dark" },
] as const;

interface AppearanceToggleProps {
    darkMode: boolean;
    onChange: (darkMode: boolean) => void;
}

/**
 * Light/Dark segmented control for the Appearance row. The design mock also
 * shows an "Auto" segment, but `UserSettings.darkMode` is a stored boolean —
 * a tri-state needs a data-model change, so Auto is deliberately omitted.
 */
export function AppearanceToggle({ darkMode, onChange }: AppearanceToggleProps) {

    return (
        <div className="flex w-full rounded-[9px] bg-muted p-0.5 sm:w-auto">
            {OPTIONS.map((option) => (
                <button
                    key={option.label}
                    type="button"
                    aria-pressed={darkMode === option.darkMode}
                    onClick={() => onChange(option.darkMode)}
                    className={`flex-1 rounded-[7px] px-4 py-1.5 text-[13px] font-semibold transition-all duration-200 sm:flex-initial ${
                        darkMode === option.darkMode
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground"
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
