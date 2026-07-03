"use client";

import { User as UserIcon, Settings } from "lucide-react";

export type ActiveTab = "profile" | "settings";

interface AccountTabsProps {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
}

export function AccountTabs({ activeTab, onTabChange }: AccountTabsProps) {
    return (
        <div className="sticky top-[57px] sm:top-[65px] z-30 bg-card border-b border-border">
            <div className="px-4 sm:max-w-2xl sm:mx-auto">
                <div className="flex">
                    <button
                        onClick={() => onTabChange("profile")}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                            activeTab === "profile"
                                ? "border-green-500 text-green-600"
                                : "border-transparent text-muted-foreground active:text-foreground"
                        }`}
                    >
                        <UserIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span>Profile</span>
                    </button>
                    <button
                        onClick={() => onTabChange("settings")}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                            activeTab === "settings"
                                ? "border-green-500 text-green-600"
                                : "border-transparent text-muted-foreground active:text-foreground"
                        }`}
                    >
                        <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span>Settings</span>
                    </button>
                </div>
            </div>
        </div>
    );
}