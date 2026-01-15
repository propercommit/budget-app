import { iconMap } from "@/lib/icon-map";

interface CategoryChipProps {
    icon?: string;
    label: string;
    color: string;
    selected: boolean;
    onClick: () => void;
    onEdit?: () => void;
}

export function CategoryChip({ icon, label, color, selected, onClick, onEdit }: CategoryChipProps) {
    const handleIconClick = (e: React.MouseEvent) => {
        if (onEdit) {
            e.stopPropagation();
            onEdit();
        }
    };

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all"
            style={{ 
                backgroundColor: selected ? color : "transparent", 
                color: selected ? "white" : "gray",
                borderColor: selected ? color : "transparent"
            }}
        >
            {icon && (
                <span 
                    onClick={handleIconClick}
                    className={onEdit ? "cursor-pointer transition-transform duration-200 hover:rotate-6 hover:scale-110" : ""}
                >
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