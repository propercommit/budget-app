interface GraphToggleBtnProps {
    label: string;
    isActive: boolean;
    onToggle: () => void;
}

export function GraphToggleBtn({ label, isActive, onToggle }: GraphToggleBtnProps) {
    return (
        <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm sm:text-base font-medium text-muted-foreground whitespace-nowrap">
                <span className="hidden sm:inline">show </span>
                {label}
            </span>
            <button
                onClick={onToggle}
                className={`relative inline-flex h-7 w-12 sm:h-8 sm:w-14 items-center rounded-full transition-colors duration-300 ease-in-out touch-manipulation ${
                    isActive ? "bg-green-500" : "bg-gray-200"
                }`}
                style={{
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)"
                }}
                aria-label={`Toggle ${label}`}
                aria-pressed={isActive}
            >
                <span
                    className={`inline-block h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white transition-transform duration-300 ease-in-out ${
                        isActive ? "translate-x-5 sm:translate-x-6" : "translate-x-0.5"
                    }`}
                    style={{
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)"
                    }}
                />
            </button>
        </div>
    );
}