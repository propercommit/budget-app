"use client"
import { Logo } from "./logo";

interface HeaderProps {
    title: string;
    legendLabel: string;
}

export function Header({ title, legendLabel }: HeaderProps) {
    return (
        <div>
            <div className="flex items-center mb-2 w-fit">
                <div className="mr-3">
                    <Logo size="md" animated={true} />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            </div>
            <p className="text-sm text-gray-500 mb-4">{legendLabel}</p>
        </div>
    );
}