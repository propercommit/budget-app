"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"

import { AccountHeader } from "@/components/account/components/account-header"
import { AccountTabs, type ActiveTab } from "@/components/account/components/account-tabs"
import { ProfileAvatar } from "@/components/account/components/profile-avatar"
import { ProfileForm } from "@/components/account/components/profile-form"
import { EmailCard, PasswordCard, DangerZone } from "@/components/account/components/action-cards"
import { SettingsTab } from "@/components/account/components/settings-tab"
import { EmailModal } from "@/components/account/components/modals/email-modal"
import { PasswordModal } from "@/components/account/components/modals/password-modal"
import { DeleteModal } from "@/components/account/components/modals/delete-modal"
import { LogoutModal } from "@/components/account/components/modals/logout-modal"

// Types
interface UserMetadata {
    first_name?: string
    last_name?: string
    avatar_url?: string
}

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

    // Tab & Modal state
    const [activeTab, setActiveTab] = useState<ActiveTab>("profile")
    const [activeModal, setActiveModal] = useState<ModalType>(null)

    // Form state - Profile
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
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
    const isGoogleUser = user?.app_metadata?.provider === "google"

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

    const handleAvatarUpload = async (file: File) => {
        setIsUploadingAvatar(true)
        setError(null)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user?.id}-${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) {
                setError("Failed to upload image. Please try again.")
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

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
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: emailPassword,
            })

            if (signInError) {
                setError("Incorrect password")
                setIsSaving(false)
                return
            }

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
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: currentPassword,
            })

            if (signInError) {
                setError("Current password is incorrect")
                setIsSaving(false)
                return
            }

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
            // Authoritative: clears the (possibly chunked) auth cookies via
            // Set-Cookie headers from the server.
            await fetch("/auth/signout", { method: "POST" })
        } catch {
            // Network fallback — clear whatever the browser client can.
            await supabase.auth.signOut().catch(() => {})
        }
        // Hard reload guarantees a fresh cookie jar and a brand-new Supabase
        // client, so no stale session can leak into the next sign-in.
        window.location.assign("/login")
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE") {
            setError("Please type DELETE to confirm")
            return
        }

        if (!isGoogleUser && !deletePassword) {
            setError("Please enter your password")
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            if (!isGoogleUser) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: userEmail,
                    password: deletePassword,
                })

                if (signInError) {
                    setError("Incorrect password")
                    setIsSaving(false)
                    return
                }
            }

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
            <AccountHeader onBack={handleBack} onLogout={() => setActiveModal("logout")} />
            <AccountTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Feedback Messages */}
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

            <main className="py-4 sm:py-6 sm:max-w-2xl sm:mx-auto">
                {activeTab === "profile" && (
                    <div className="space-y-4 sm:space-y-6 sm:px-4">
                        {/* Profile Card */}
                        <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
                            <div className="px-4 py-6 sm:p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                                    Profile Information
                                </h2>

                                <ProfileAvatar
                                    avatarUrl={avatarUrl}
                                    initials={initials}
                                    firstName={firstName}
                                    lastName={lastName}
                                    email={userEmail}
                                    isUploading={isUploadingAvatar}
                                    onUpload={handleAvatarUpload}
                                    onRemove={handleRemoveAvatar}
                                    onError={setError}
                                />

                                <ProfileForm
                                    firstName={firstName}
                                    lastName={lastName}
                                    hasChanges={hasProfileChanges}
                                    isSaving={isSaving}
                                    onFirstNameChange={setFirstName}
                                    onLastNameChange={setLastName}
                                    onSave={handleSaveProfile}
                                />
                            </div>
                        </div>

                        {!isGoogleUser && (
                            <>
                                <EmailCard email={userEmail} onClick={() => setActiveModal("email")} />
                                <PasswordCard onClick={() => setActiveModal("password")} />
                            </>
                        )}

                        <DangerZone onDelete={() => setActiveModal("delete")} />
                    </div>
                )}

                {activeTab === "settings" && <SettingsTab />}
            </main>

            {/* Modals */}
            {!isGoogleUser && (
                <>
                    <EmailModal
                        isOpen={activeModal === "email"}
                        onClose={closeModal}
                        currentEmail={userEmail}
                        newEmail={newEmail}
                        password={emailPassword}
                        error={activeModal === "email" ? error : null}
                        isSaving={isSaving}
                        onNewEmailChange={setNewEmail}
                        onPasswordChange={setEmailPassword}
                        onSubmit={handleChangeEmail}
                    />
                    <PasswordModal
                        isOpen={activeModal === "password"}
                        onClose={closeModal}
                        currentPassword={currentPassword}
                        newPassword={newPassword}
                        confirmPassword={confirmNewPassword}
                        error={activeModal === "password" ? error : null}
                        isSaving={isSaving}
                        onCurrentPasswordChange={setCurrentPassword}
                        onNewPasswordChange={setNewPassword}
                        onConfirmPasswordChange={setConfirmNewPassword}
                        onSubmit={handleChangePassword}
                    />
                </>
            )}

            <DeleteModal
                isOpen={activeModal === "delete"}
                onClose={closeModal}
                confirmText={deleteConfirmText}
                password={deletePassword}
                error={activeModal === "delete" ? error : null}
                isSaving={isSaving}
                isGoogleUser={isGoogleUser}
                onConfirmTextChange={setDeleteConfirmText}
                onPasswordChange={setDeletePassword}
                onSubmit={handleDeleteAccount}
            />

            <LogoutModal
                isOpen={activeModal === "logout"}
                onClose={closeModal}
                isSaving={isSaving}
                onSubmit={handleLogout}
            />
        </div>
    )
}