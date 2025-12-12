
type TextSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ChipProps {
    textSize: TextSize;
    backgroundColor: string;
    textColor: string;
    label: string;
}

export function Chip({textSize, backgroundColor, textColor, label}: ChipProps) {
    return (
        <span 
            className={`
                px-3 
                py-1 
                rounded-full 
                text-${textSize}
                font-medium
            `}
            style={{ backgroundColor, color: textColor }}
        >
            {label}
        </span>
    );
}