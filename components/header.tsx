"use client"

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { Logo } from "./logo";
import { Button } from "./ui/button";
import { User as UserIcon, Loader2 } from "lucide-react";

interface HeaderProps {
    title: string;
    legendLabel: string;
}

/**
 * Extracts a display name from user data.
 * Priority: first_name + last_name > email prefix > fallback
 */
function getDisplayName(user: User | null): string {
    if (!user) return "Account";
    
    const firstName = user.user_metadata?.first_name;
    const lastName = user.user_metadata?.last_name;
    
    if (firstName && typeof firstName === "string" && firstName.trim() !== "") {
        const fullName = lastName ? `${firstName.trim()} ${lastName.trim()}` : firstName.trim();
        return fullName;
    }

    const email = user.email;
    if (email && typeof email === "string") {
        return email.split("@")[0];
    }

    return "Account";
}

export function Header({ title, legendLabel }: HeaderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchUser = useCallback(async () => {
        try {
            const supabase = createClient();
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) {
                console.error("[Header] Failed to fetch user:", error.message);
                return;
            }
            
            setUser(user);
        } catch (error) {
            console.error("[Header] Unexpected error fetching user:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const handleAccountClick = () => {
        router.push("/account");
    };

    const displayName = getDisplayName(user);

    return (
        <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0 flex-1">
                <div className="flex items-center mb-1 sm:mb-2">
                    <div className="mr-2 sm:mr-3 flex-shrink-0">
                        <Logo size="md" animated={true} />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">{title}</h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 sm:line-clamp-1">{legendLabel}</p>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={handleAccountClick}
                disabled={isLoading}
                className="flex items-center gap-2 flex-shrink-0"
                aria-label="Go to account settings"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <UserIcon className="w-4 h-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline max-w-32 truncate">
                    {displayName}
                </span>
            </Button>
        </div>
    );
}