"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { 
    Loader2, 
    ChevronLeft, 
    Camera, 
    X, 
    Mail, 
    Lock, 
    LogOut, 
    Trash2, 
    User as UserIcon, 
    Settings,
    AlertTriangle
} from "lucide-react"
import type { User } from "@supabase/supabase-js"

// Constants
const MAX_AVATAR_SIZE_MB = 2
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

// Types
interface UserMetadata {
    first_name?: string
    last_name?: string
    avatar_url?: string
}

type ActiveTab = "profile" | "settings"
type ModalType = "email" | "password" | "delete" | "logout" | null

export default function AccountPage() {
    const router = useRouter()
    const supabase = createClient()

    // Loading states
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

    // User state
    const [user, setUser] = useState<User | null>(null)
    
    // Tab state
    const [activeTab, setActiveTab] = useState<ActiveTab>("profile")
    
    // Modal state
    const [activeModal, setActiveModal] = useState<ModalType>(null)

    // Form state - Profile
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    
    // Track initial values for change detection
    const [initialFirstName, setInitialFirstName] = useState("")
    const [initialLastName, setInitialLastName] = useState("")

    // Form state - Email change
    const [newEmail, setNewEmail] = useState("")
    const [emailPassword, setEmailPassword] = useState("")
    
    // Form state - Password change
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmNewPassword, setConfirmNewPassword] = useState("")
    
    // Form state - Delete account
    const [deleteConfirmText, setDeleteConfirmText] = useState("")
    const [deletePassword, setDeletePassword] = useState("")

    // Feedback state
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Derived state
    const hasProfileChanges = firstName !== initialFirstName || lastName !== initialLastName
    const userEmail = user?.email ?? ""
    const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?"

    // Fetch user on mount
    useEffect(() => {
        async function fetchUser() {
            try {
                const { data: { user }, error } = await supabase.auth.getUser()
                
                if (error || !user) {
                    router.push("/login")
                    return
                }

                setUser(user)
                
                const metadata = user.user_metadata as UserMetadata
                const fName = metadata.first_name ?? ""
                const lName = metadata.last_name ?? ""
                
                setFirstName(fName)
                setLastName(lName)
                setInitialFirstName(fName)
                setInitialLastName(lName)
                setAvatarUrl(metadata.avatar_url ?? null)
            } catch {
                router.push("/login")
            } finally {
                setIsLoading(false)
            }
        }

        fetchUser()
    }, [supabase, router])

    // Clear feedback messages after delay
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null)
                setSuccess(null)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [error, success])

    // Handlers
    const handleBack = useCallback(() => {
        router.push("/")
    }, [router])

    const handleSaveProfile = async () => {
        if (!hasProfileChanges) return
        
        setIsSaving(true)
        setError(null)

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                }
            })

            if (error) {
                setError(error.message)
                return
            }

            setInitialFirstName(firstName.trim())
            setInitialLastName(lastName.trim())
            setSuccess("Profile updated successfully")
            setTimeout(() => {
                router.push("/")
            }, 1500)
        } catch {
            setError("Failed to update profile. Please try again.")
        } finally {
            setIsSaving(false)
        }

    }

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setError("Please upload a JPEG, PNG, or WebP image")
            return
        }

        // Validate file size
        const sizeMB = file.size / (1024 * 1024)
        if (sizeMB > MAX_AVATAR_SIZE_MB) {
            setError(`Image must be smaller than ${MAX_AVATAR_SIZE_MB}MB`)
            return
        }

        setIsUploadingAvatar(true)
        setError(null)

        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop()
            const fileName = `${user?.id}-${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) {
                setError("Failed to upload image. Please try again.")
                return
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update user metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            })

            if (updateError) {
                setError("Failed to update profile picture")
                return
            }

            setAvatarUrl(publicUrl)
            setSuccess("Profile picture updated")
        } catch {
            setError("Failed to upload image. Please try again.")
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const handleRemoveAvatar = async () => {
        setIsUploadingAvatar(true)
        setError(null)

        try {
            const { error } = await supabase.auth.updateUser({
                data: { avatar_url: null }
            })

            if (error) {
                setError("Failed to remove profile picture")
                return
            }

            setAvatarUrl(null)
            setSuccess("Profile picture removed")
        } catch {
            setError("Failed to remove profile picture")
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const handleChangeEmail = async () => {
        if (!newEmail.trim() || !emailPassword) {
            setError("Please fill in all fields")
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            // First verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: emailPassword,
            })

            if (signInError) {
                setError("Incorrect password")
                setIsSaving(false)
                return
            }

            // Update email
            const { error } = await supabase.auth.updateUser({
                email: newEmail.trim(),
            })

            if (error) {
                setError(error.message)
                return
            }

            setSuccess("Verification email sent to your new address")
            closeModal()
        } catch {
            setError("Failed to update email. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setError("Please fill in all fields")
            return
        }

        if (newPassword !== confirmNewPassword) {
            setError("New passwords do not match")
            return
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters")
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            // Verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: currentPassword,
            })

            if (signInError) {
                setError("Current password is incorrect")
                setIsSaving(false)
                return
            }

            // Update password
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            })

            if (error) {
                setError(error.message)
                return
            }

            setSuccess("Password updated successfully")
            closeModal()
        } catch {
            setError("Failed to update password. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogout = async () => {
        setIsSaving(true)
        
        try {
            await supabase.auth.signOut()
            router.push("/login")
        } catch {
            setError("Failed to logout. Please try again.")
            setIsSaving(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE") {
            setError("Please type DELETE to confirm")
            return
        }

        if (!deletePassword) {
            setError("Please enter your password")
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            // Verify password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: deletePassword,
            })

            if (signInError) {
                setError("Incorrect password")
                setIsSaving(false)
                return
            }

            // Call delete account API
            const response = await fetch("/api/account/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            })

            if (!response.ok) {
                setError("Failed to delete account. Please try again.")
                setIsSaving(false)
                return
            }

            await supabase.auth.signOut()
            router.push("/login")
        } catch {
            setError("Failed to delete account. Please try again.")
            setIsSaving(false)
        }
    }

    const closeModal = () => {
        setActiveModal(null)
        setNewEmail("")
        setEmailPassword("")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
        setDeleteConfirmText("")
        setDeletePassword("")
        setError(null)
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-svh flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        )
    }

    return (
        <div className="min-h-svh bg-gray-50 pb-safe">
            {/* Header - Full width on mobile */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
                <div className="px-4 py-3 sm:py-4 sm:max-w-2xl sm:mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Back button - larger touch target on mobile */}
                            <button 
                                onClick={handleBack}
                                className="p-3 -ml-3 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors touch-manipulation"
                                aria-label="Go back"
                            >
                                <ChevronLeft className="w-6 h-6 text-gray-600" />
                            </button>
                            <Logo size="sm" animated={false} />
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                    Account Settings
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                                    Manage your profile
                                </p>
                            </div>
                        </div>
                        
                        {/* Logout button - icon only on mobile */}
                        <button
                            onClick={() => setActiveModal("logout")}
                            className="p-3 -mr-3 sm:mr-0 sm:px-4 sm:py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 rounded-full sm:rounded-lg transition-colors touch-manipulation"
                            aria-label="Logout"
                        >
                            <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline sm:ml-2">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Tab Navigation - Full width, scrollable on mobile */}
            <div className="sticky top-[57px] sm:top-[65px] z-30 bg-white border-b border-gray-200">
                <div className="px-4 sm:max-w-2xl sm:mx-auto">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab("profile")}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                                activeTab === "profile"
                                    ? "border-green-500 text-green-600"
                                    : "border-transparent text-gray-500 active:text-gray-700"
                            }`}
                        >
                            <UserIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Profile</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("settings")}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                                activeTab === "settings"
                                    ? "border-green-500 text-green-600"
                                    : "border-transparent text-gray-500 active:text-gray-700"
                            }`}
                        >
                            <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span>Settings</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Feedback Messages - Full width on mobile */}
            {(error || success) && (
                <div className="px-4 pt-4 sm:max-w-2xl sm:mx-auto">
                    <div 
                        role="alert"
                        className={`p-4 rounded-xl text-sm font-medium ${
                            success 
                                ? "bg-green-50 text-green-700 border border-green-200" 
                                : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                    >
                        {success || error}
                    </div>
                </div>
            )}

            {/* Content - Full bleed cards on mobile, contained on desktop */}
            <main className="py-4 sm:py-6 sm:max-w-2xl sm:mx-auto">
                {activeTab === "profile" && (
                    <div className="space-y-4 sm:space-y-6 sm:px-4">
                        {/* Profile Card */}
                        <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
                            <div className="px-4 py-6 sm:p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                                    Profile Information
                                </h2>

                                {/* Avatar - Centered, large touch targets */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className="relative">
                                        {avatarUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                                src={avatarUrl} 
                                                alt="profile picture" 
                                                className="w-28 h-28 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                            />
                                        ) : (
                                            <div className="w-28 h-28 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                                                <span className="text-white font-bold text-4xl sm:text-3xl">
                                                    {initials}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {isUploadingAvatar ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                                            </div>
                                        ) : (
                                            <div className="absolute -bottom-2 -right-2 flex gap-1">
                                                {/* Upload button - 44px minimum touch target */}
                                                <label className="w-11 h-11 sm:w-9 sm:h-9 bg-green-500 rounded-full flex items-center justify-center shadow-md hover:bg-green-600 active:bg-green-700 transition-colors cursor-pointer touch-manipulation">
                                                    <Camera className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        onChange={handleAvatarUpload}
                                                        className="hidden"
                                                        aria-label="Upload profile picture"
                                                    />
                                                </label>
                                                {avatarUrl && (
                                                    <button 
                                                        onClick={handleRemoveAvatar}
                                                        className="w-11 h-11 sm:w-9 sm:h-9 bg-red-500 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 active:bg-red-700 transition-colors touch-manipulation"
                                                        aria-label="Remove profile picture"
                                                    >
                                                        <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-4 text-lg font-medium text-gray-900">
                                        {firstName} {lastName}
                                    </p>
                                    <p className="text-sm text-gray-500">{userEmail}</p>
                                </div>

                                {/* Form Fields - Stacked on mobile */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label 
                                                htmlFor="firstName" 
                                                className="text-sm font-medium text-gray-700"
                                            >
                                                First Name
                                            </Label>
                                            <Input
                                                id="firstName"
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="h-12 text-base rounded-xl"
                                                placeholder="John"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label 
                                                htmlFor="lastName" 
                                                className="text-sm font-medium text-gray-700"
                                            >
                                                Last Name
                                            </Label>
                                            <Input
                                                id="lastName"
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="h-12 text-base rounded-xl"
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Save button - Full width, large touch target */}
                                <Button 
                                    onClick={handleSaveProfile}
                                    disabled={!hasProfileChanges || isSaving}
                                    className={`w-full mt-6 h-12 text-base font-medium rounded-xl transition-colors touch-manipulation ${
                                        hasProfileChanges 
                                            ? "bg-green-500 hover:bg-green-600 active:bg-green-700" 
                                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Email Card */}
                        <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
                            <button
                                onClick={() => setActiveModal("email")}
                                className="w-full px-4 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 sm:w-10 sm:h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600" />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <h3 className="font-medium text-gray-900">Email Address</h3>
                                        <p className="text-sm text-gray-500 truncate">{userEmail}</p>
                                    </div>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180 flex-shrink-0" />
                            </button>
                        </div>

                        {/* Password Card */}
                        <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
                            <button
                                onClick={() => setActiveModal("password")}
                                className="w-full px-4 py-5 sm:p-6 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Lock className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-medium text-gray-900">Password</h3>
                                        <p className="text-sm text-gray-500">Keep your account secure</p>
                                    </div>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180 flex-shrink-0" />
                            </button>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-white border-y sm:border sm:rounded-2xl border-red-200 overflow-hidden">
                            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-red-50 border-b border-red-200">
                                <h3 className="font-medium text-red-800">Danger Zone</h3>
                            </div>
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Delete Account</h4>
                                        <p className="text-sm text-gray-500">
                                            Permanently delete your account and all data
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setActiveModal("delete")}
                                        className="h-12 sm:h-10 text-red-600 border-red-300 hover:bg-red-50 active:bg-red-100 rounded-xl touch-manipulation"
                                    >
                                        <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                                        Delete Account
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="space-y-4 sm:space-y-6 sm:px-4">
                        {/* Preferences Card */}
                        <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
                            <div className="px-4 py-5 sm:p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Preferences
                                </h2>
                                
                                <div className="space-y-1">
                                    {/* Currency */}
                                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                                        <div className="pr-4">
                                            <h4 className="font-medium text-gray-900">Currency</h4>
                                            <p className="text-sm text-gray-500">Your preferred currency</p>
                                        </div>
                                        <select className="h-12 sm:h-10 px-4 border border-gray-300 rounded-xl text-base sm:text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none touch-manipulation">
                                            <option>USD ($)</option>
                                            <option>EUR (€)</option>
                                            <option>GBP (£)</option>
                                            <option>CHF (Fr)</option>
                                        </select>
                                    </div>

                                    {/* Date Format */}
                                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                                        <div className="pr-4">
                                            <h4 className="font-medium text-gray-900">Date Format</h4>
                                            <p className="text-sm text-gray-500">How dates are displayed</p>
                                        </div>
                                        <select className="h-12 sm:h-10 px-4 border border-gray-300 rounded-xl text-base sm:text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none touch-manipulation">
                                            <option>MM/DD/YYYY</option>
                                            <option>DD/MM/YYYY</option>
                                            <option>YYYY-MM-DD</option>
                                        </select>
                                    </div>

                                    {/* Dark Mode */}
                                    <div className="flex items-center justify-between py-4">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Dark Mode</h4>
                                            <p className="text-sm text-gray-500">Use dark theme</p>
                                        </div>
                                        <button 
                                            className="relative w-14 h-8 sm:w-12 sm:h-7 bg-gray-200 rounded-full transition-colors touch-manipulation"
                                            aria-label="Toggle dark mode"
                                        >
                                            <span className="absolute left-1 top-1 w-6 h-6 sm:w-5 sm:h-5 bg-white rounded-full shadow transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Data Export Card */}
                        <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
                            <div className="px-4 py-5 sm:p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Data</h2>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900">Export Your Data</h4>
                                        <p className="text-sm text-gray-500">
                                            Download all your budget data as CSV
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-12 sm:h-10 text-green-600 border-green-300 hover:bg-green-50 active:bg-green-100 rounded-xl touch-manipulation"
                                    >
                                        Export Data
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Change Email Modal - Bottom sheet style on mobile */}
            <Dialog open={activeModal === "email"} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 sm:w-10 sm:h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Mail className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Change Email</DialogTitle>
                                <DialogDescription>We&apos;ll send a verification link</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentEmail" className="text-sm font-medium text-gray-700">
                                Current Email
                            </Label>
                            <Input
                                id="currentEmail"
                                type="email"
                                value={userEmail}
                                disabled
                                className="h-12 text-base bg-gray-50 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newEmail" className="text-sm font-medium text-gray-700">
                                New Email
                            </Label>
                            <Input
                                id="newEmail"
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="Enter new email address"
                                className="h-12 text-base rounded-xl"
                                autoComplete="email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="emailPassword" className="text-sm font-medium text-gray-700">
                                Confirm Password
                            </Label>
                            <Input
                                id="emailPassword"
                                type="password"
                                value={emailPassword}
                                onChange={(e) => setEmailPassword(e.target.value)}
                                placeholder="Enter your password to confirm"
                                className="h-12 text-base rounded-xl"
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700">
                            <p>Verification links will be sent to both your current and new email addresses.</p>
                            <p className="mt-2">1) Click the link in your <strong>current email first</strong></p> 
                            <p>2) then the link in your <strong>new email</strong></p> 
                        </div>

                        {error && (
                            <div className="bg-red-50 p-4 rounded-xl text-sm text-red-700">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={closeModal}
                            className="h-12 rounded-xl touch-manipulation"
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleChangeEmail}
                            className="h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-xl flex-1 touch-manipulation"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Send Verification"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Change Password Modal */}
            <Dialog open={activeModal === "password"} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                <Lock className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Change Password</DialogTitle>
                                <DialogDescription>Keep your account secure</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                                Current Password
                            </Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="h-12 text-base rounded-xl"
                                autoComplete="current-password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                                New Password
                            </Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="h-12 text-base rounded-xl"
                                autoComplete="new-password"
                            />
                            <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmNewPassword" className="text-sm font-medium text-gray-700">
                                Confirm New Password
                            </Label>
                            <Input
                                id="confirmNewPassword"
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="h-12 text-base rounded-xl"
                                autoComplete="new-password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 p-4 rounded-xl text-sm text-red-700">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={closeModal}
                            className="h-12 rounded-xl touch-manipulation"
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleChangePassword}
                            className="h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-xl flex-1 touch-manipulation"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Account Modal */}
            <Dialog open={activeModal === "delete"} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 sm:w-10 sm:h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Delete Account</DialogTitle>
                                <DialogDescription>This action is permanent</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-sm text-red-800 font-medium">
                                Warning: This will permanently delete:
                            </p>
                            <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                <li>All spending records</li>
                                <li>All categories and budgets</li>
                                <li>All uploaded receipts</li>
                                <li>Your profile information</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deleteConfirm" className="text-sm font-medium text-gray-700">
                                Type &quot;DELETE&quot; to confirm
                            </Label>
                            <Input
                                id="deleteConfirm"
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="h-12 text-base rounded-xl"
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deletePassword" className="text-sm font-medium text-gray-700">
                                Enter your password
                            </Label>
                            <Input
                                id="deletePassword"
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Enter password to confirm"
                                className="h-12 text-base rounded-xl"
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 p-4 rounded-xl text-sm text-red-700">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={closeModal}
                            className="h-12 rounded-xl touch-manipulation"
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteAccount}
                            className="h-12 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl flex-1 touch-manipulation"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Delete Forever"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Logout Modal */}
            <Dialog open={activeModal === "logout"} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="sm:max-w-sm rounded-t-3xl sm:rounded-2xl">
                    <div className="text-center py-4">
                        <div className="w-16 h-16 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogOut className="w-8 h-8 sm:w-6 sm:h-6 text-gray-600" />
                        </div>
                        <DialogTitle className="text-xl sm:text-lg font-semibold text-gray-900 mb-2">
                            Logout
                        </DialogTitle>
                        <DialogDescription className="text-base sm:text-sm text-gray-500">
                            Are you sure you want to logout?
                        </DialogDescription>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={closeModal}
                            className="h-12 rounded-xl touch-manipulation"
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLogout}
                            className="h-12 bg-gray-900 hover:bg-gray-800 active:bg-gray-700 text-white rounded-xl flex-1 touch-manipulation"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Logout"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}