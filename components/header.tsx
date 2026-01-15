import { LucideIcon } from "lucide-react";

interface HeaderProps {
    Icon: LucideIcon;
    title: string;
    legendLabel: string;
}

export function Header({Icon, title, legendLabel}: HeaderProps) {
    return (
        <div>
        <div className="flex gap-2 items-center mb-2">
            <div className="bg-green-500 rounded-lg p-2">
                <Icon className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
        </div>
            <p className="text-sm text-gray-500 mb-4">{legendLabel}</p>
        </div>
    );
}