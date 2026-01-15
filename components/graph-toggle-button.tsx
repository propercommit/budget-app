interface GraphToggleBtnProps {
    label: string;
    isActive: boolean;
    onToggle: () => void;
}

export function GraphToggleBtn({ label, isActive, onToggle }: GraphToggleBtnProps) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-base font-medium text-muted-foreground">show {label}</span>
            <button
                onClick={onToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 ease-in-out ${
                    isActive ? "bg-green-500" : "bg-gray-200"
                }`}
                style={{
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)"
                }}
                aria-label={`Toggle ${label}`}
            >
                <span
                    className={`inline-block h-7 w-7 rounded-full bg-white transition-transform duration-300 ease-in-out ${
                        isActive ? "translate-x-6" : "translate-x-0.5"
                    }`}
                    style={{
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)"
                    }}
                />
            </button>
        </div>
    );
}