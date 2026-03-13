"use client";
import { iconMap } from "@/lib/icon-map";
import { ExpandToggleButton } from "./expand-toggle-button";

interface CardHeaderProps {
    isExpanded: boolean;
    onToggle: () => void;
    title: string;
    icon?: React.ReactNode;
    iconBgColor?: string;
}

export function CardHeader({ isExpanded, onToggle, title, icon, iconBgColor = 'rgba(0, 122, 255, 0.1)' }: CardHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                {icon && (
                    <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: iconBgColor }}
                    >
                        {typeof icon === 'string' ? iconMap[icon] : icon}
                    </div>
                )}
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            </div>
            <ExpandToggleButton
                isExpanded={isExpanded}
                onToggle={onToggle}
                className="w-10 h-10"
            />
        </div>
    );
}