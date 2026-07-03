import { ReactNode } from "react";

interface SectionCardProps {
    children: ReactNode;
    className?: string;
}

export function SectionCard({ children, className = "" }: SectionCardProps) {
    return (
        <div
            className={`bg-card border border-(--card-border) rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] ${className}`}
        >
            {children}
        </div>
    );
}