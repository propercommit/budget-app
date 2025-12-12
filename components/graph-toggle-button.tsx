import { Switch } from "./ui/switch";

interface GraphToggleBtnProps {
    label: string;
}

export function GraphToggleBtn({label}: GraphToggleBtnProps) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{label}</span>
            <Switch className={`data-[state=checked]:bg-green-500`}/>
        </div>
    );
}