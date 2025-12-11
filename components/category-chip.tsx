import { LucideIcon } from "lucide-react";

interface CategoryChipProps {
    icon?: LucideIcon;
    label: string;
    color: string;
    selected: boolean;
    onClick: () => void
};

export function CategoryChip({icon: Icon, label, color, selected, onClick}: CategoryChipProps) {
    return (
        <button 
            onClick={onClick} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full" 
            style={{ 
                backgroundColor: selected ? color : "transparent", 
                color: selected ? "white" : "gray"
            }}>
            {Icon && <Icon className="w-4 h-4" />}
            <span>{label}</span>
        </button>
    );
}