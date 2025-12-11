import { DollarSign } from "lucide-react";

interface IconProps {
    color: string;
};

export function CustomIcon({color}: IconProps) {
    return (
        <DollarSign className={`${color}`}/>
    );
};