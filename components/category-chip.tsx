import { iconMap } from "@/lib/icon-map";
import { LucideIcon } from "lucide-react";

interface CategoryChipProps {
    icon?: string;
    label: string;
    color: string;
    selected: boolean;
    onClick: () => void
};

export function CategoryChip({icon , label, color, selected, onClick}: CategoryChipProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ 
                backgroundColor: selected ? color : "transparent", 
                color: selected ? "white" : "gray"
            }}>
            {icon && (
                icon.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" className="w-4 h-4 object-contain" />
            ) : (
                iconMap[icon]
            )
        )}
            <span>{label}</span>
        </button>
    );
}