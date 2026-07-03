"use client";

import { Loader2, Camera, X } from "lucide-react";

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
        if (!file) return;

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
        <div className="flex flex-col items-center mb-8">
            <div className="relative">
                {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={avatarUrl}
                        alt="profile picture"
                        className="w-28 h-28 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-background shadow-lg"
                    />
                ) : (
                    <div className="w-28 h-28 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center border-4 border-background shadow-lg">
                        <span className="text-white font-bold text-4xl sm:text-3xl">
                            {initials}
                        </span>
                    </div>
                )}

                {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                ) : (
                    <div className="absolute -bottom-2 -right-2 flex gap-1">
                        <label className="w-11 h-11 sm:w-9 sm:h-9 bg-green-500 rounded-full flex items-center justify-center shadow-md hover:bg-green-600 active:bg-green-700 transition-colors cursor-pointer touch-manipulation">
                            <Camera className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                                aria-label="Upload profile picture"
                            />
                        </label>
                        {avatarUrl && (
                            <button
                                onClick={onRemove}
                                className="w-11 h-11 sm:w-9 sm:h-9 bg-red-500 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 active:bg-red-700 transition-colors touch-manipulation"
                                aria-label="Remove profile picture"
                            >
                                <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                            </button>
                        )}
                    </div>
                )}
            </div>
            <p className="mt-4 text-lg font-medium text-foreground">
                {firstName} {lastName}
            </p>
            <p className="text-sm text-muted-foreground">{email}</p>
        </div>
    );
}