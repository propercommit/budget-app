import { ReactNode } from "react";

interface SectionCardProps {
    children: ReactNode;
    className?: string;
}

export function SectionCard({ children, className = "" }: SectionCardProps) {
    return (
        <div
            className={`bg-white rounded-3xl p-4 sm:p-5 ${className}`}
            style={{
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03)",
                border: "1px solid rgba(0, 0, 0, 0.04)",
            }}
        >
            {children}
        </div>
    );
}