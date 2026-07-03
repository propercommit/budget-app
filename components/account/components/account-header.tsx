"use client";

import { ChevronLeft, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";

interface AccountHeaderProps {
    onBack: () => void;
    onLogout: () => void;
}

export function AccountHeader({ onBack, onLogout }: AccountHeaderProps) {
    return (
        <header className="sticky top-0 z-40 bg-card border-b border-border">
            <div className="px-4 py-3 sm:py-4 sm:max-w-2xl sm:mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={onBack}
                            className="p-3 -ml-3 hover:bg-muted active:bg-input rounded-full transition-colors touch-manipulation"
                            aria-label="Go back"
                        >
                            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
                        </button>
                        <Logo size="sm" animated={false} />
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
                                Account Settings
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                                Manage your profile
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onLogout}
                        className="p-3 -mr-3 sm:mr-0 sm:px-4 sm:py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted active:bg-input rounded-full sm:rounded-lg transition-colors touch-manipulation"
                        aria-label="Logout"
                    >
                        <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline sm:ml-2">Logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
}