import { useRef, useCallback, useEffect } from "react";
import { iconMap } from "@/lib/icon-map";

interface CategoryChipProps {
    icon?: string;
    label: string;
    color: string;
    selected: boolean;
    onClick: () => void;
    onLongPress?: () => void;
}

const LONG_PRESS_DURATION = 500;

export function CategoryChip({ icon, label, color, selected, onClick, onLongPress }: CategoryChipProps) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressRef = useRef(false);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const startPress = useCallback(() => {
        isLongPressRef.current = false;
        
        if (onLongPress) {
            timerRef.current = setTimeout(() => {
                isLongPressRef.current = true;
                onLongPress();
            }, LONG_PRESS_DURATION);
        }
    }, [onLongPress]);

    const endPress = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleClick = useCallback(() => {
        if (isLongPressRef.current) {
            isLongPressRef.current = false;
            return;
        }
        onClick();
    }, [onClick]);

    return (
        <button
            onClick={handleClick}
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all select-none"
            style={{ 
                backgroundColor: selected ? color : "transparent", 
                color: selected ? "white" : "var(--muted-foreground)",
                borderColor: selected ? color : "transparent"
            }}
        >
            {icon && (
                <span>
                    {icon.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={icon} alt="" className="w-4 h-4 object-contain" />
                    ) : (
                        iconMap[icon]
                    )}
                </span>
            )}
            <span>{label}</span>
        </button>
    );
}