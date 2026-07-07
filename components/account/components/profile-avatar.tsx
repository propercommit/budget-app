"use client";

import { Loader2 } from "lucide-react";

const MAX_AVATAR_SIZE_MB = 2;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ProfileAvatarProps {
    avatarUrl: string | null;
    initials: string;
    firstName: string;
    lastName: string;
    email: string;
    isUploading: boolean;
    onUpload: (file: File) => void;
    onRemove: () => void;
    onError: (message: string) => void;
}

/**
 * v2 identity block: avatar with name/email and a "Change Photo" pill —
 * a centered column on mobile, a row on ≥sm. Client-side type/size
 * validation happens here; upload/remove side effects live in the page.
 */
export function ProfileAvatar({
    avatarUrl,
    initials,
    firstName,
    lastName,
    email,
    isUploading,
    onUpload,
    onRemove,
    onError,
}: ProfileAvatarProps) {

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];

        if (file === undefined) return;

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            onError("Please upload a JPEG, PNG, or WebP image");
            return;
        }

        const sizeMB = file.size / (1024 * 1024);

        if (sizeMB > MAX_AVATAR_SIZE_MB) {
            onError(`Image must be smaller than ${MAX_AVATAR_SIZE_MB}MB`);
            return;
        }

        onUpload(file);
    };

    return (
        <div className="flex flex-col items-center px-1 sm:flex-row sm:gap-5">
            <div className="relative mb-2 flex-none sm:mb-0">
                {avatarUrl !== null ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={avatarUrl}
                        alt="profile picture"
                        className="h-[88px] w-[88px] rounded-full object-cover shadow-md sm:h-[76px] sm:w-[76px]"
                    />
                ) : (
                    <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-green-500 shadow-md sm:h-[76px] sm:w-[76px]">
                        <span className="text-[32px] font-bold text-white sm:text-[28px]">{initials}</span>
                    </div>
                )}

                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                        <Loader2 className="h-7 w-7 animate-spin text-white" />
                    </div>
                )}
            </div>

            <div className="flex min-w-0 flex-col items-center sm:flex-1 sm:items-start">
                <p className="max-w-full truncate text-[22px] font-bold tracking-tight text-foreground sm:text-2xl">
                    {firstName} {lastName}
                </p>
                <p className="max-w-full truncate text-sm text-muted-foreground sm:text-[15px]">{email}</p>
            </div>

            <div className="mt-2.5 flex flex-none items-center gap-2 sm:mt-0">
                <label
                    className={`rounded-full bg-foreground/5 px-4 py-2 text-sm font-semibold text-foreground transition-colors ${
                        isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-foreground/10 active:bg-foreground/15"
                    }`}
                >
                    Change Photo
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="hidden"
                        aria-label="Upload profile picture"
                    />
                </label>
                {avatarUrl !== null && (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={isUploading}
                        className="p-1 text-[13px] text-muted-foreground transition-colors hover:text-red-500"
                    >
                        Remove
                    </button>
                )}
            </div>
        </div>
    );
}
