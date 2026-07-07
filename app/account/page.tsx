"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { AVATARS_BUCKET, avatarFilePath } from "@/lib/avatar-storage"
import { Download, Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"

import { useSettings } from "@/lib/settings-context"
import { CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS } from "@/lib/constants"
import { AccountHeader } from "@/components/account/components/account-header"
import { InsetDivider } from "@/components/account/components/inset-divider"
import { ProfileAvatar } from "@/components/account/components/profile-avatar"
import { ProfileForm } from "@/components/account/components/profile-form"
import { SettingsSection, SettingsRow } from "@/components/account/components/settings-section"
import { AppearanceToggle } from "@/components/account/components/appearance-toggle"
import { EmailModal } from "@/components/account/components/modals/email-modal"
import { PasswordModal } from "@/components/account/components/modals/password-modal"
import { DeleteModal, DELETE_CONFIRMATION } from "@/components/account/components/modals/delete-modal"
import { LogoutModal } from "@/components/account/components/modals/logout-modal"
import { PickerModal } from "@/components/account/components/modals/picker-modal"

// Types
interface UserMetadata {
    first_name?: string
    last_name?: string
    avatar_url?: string
}

type ModalType = "email" | "password" | "delete" | "logout" | "currency" | "dateFormat" | null

const CURRENCY_PICKER_OPTIONS = CURRENCY_OPTIONS.map((option) => ({ value: option.code, label: option.label }))

export default function AccountPage() {
    const router = useRouter()
    const supabase = createClient()
    const { settings, updateCurrency, updateDateFormat, updateDarkMode } = useSettings()

    // Loading states
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

    // User state
    const [user, setUser] = useState<User | null>(null)

    // Modal state
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
            const filePath = avatarFilePath(user?.id ?? "", fileExt)

            const { error: uploadError } = await supabase.storage
                .from(AVATARS_BUCKET)
                .upload(filePath, file, { upsert: true })

            if (uploadError) {
                setError("Failed to upload image. Please try again.")
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from(AVATARS_BUCKET)
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

    const signOutAndRedirect = async () => {
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

    const handleLogout = async () => {
        setIsSaving(true)
        await signOutAndRedirect()
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== DELETE_CONFIRMATION) {
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

            // The account is gone server-side and its tokens are revoked;
            // clear the local session the same way logout does.
            await signOutAndRedirect()
        } catch {
            setError("Failed to delete account. Please try again.")
            setIsSaving(false)
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-svh flex items-center justify-center bg-muted dark:bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        )
    }

    return (
        <div className="min-h-svh bg-muted dark:bg-background">
            <AccountHeader onBack={handleBack} />

            {/* Feedback Messages */}
            {(error !== null || success !== null) && (
                <div className="mx-auto max-w-2xl px-4 pt-4">
                    <div
                        role="alert"
                        className={`rounded-xl p-4 text-sm font-medium ${
                            success !== null
                                ? "border border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
                                : "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
                        }`}
                    >
                        {success ?? error}
                    </div>
                </div>
            )}

            <main className="mx-auto flex max-w-2xl flex-col gap-7 px-4 pt-7 pb-16">
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

                <SettingsSection title="Profile">
                    <ProfileForm
                        firstName={firstName}
                        lastName={lastName}
                        hasChanges={hasProfileChanges}
                        isSaving={isSaving}
                        onFirstNameChange={setFirstName}
                        onLastNameChange={setLastName}
                        onSave={handleSaveProfile}
                    />
                </SettingsSection>

                {!isGoogleUser && (
                    <SettingsSection title="Security">
                        <SettingsRow label="Email" detail={userEmail} onClick={() => setActiveModal("email")} />
                        <InsetDivider className="sm:ml-5" />
                        <SettingsRow label="Password" detail="••••••••" onClick={() => setActiveModal("password")} />
                    </SettingsSection>
                )}

                <SettingsSection title="Preferences">
                    <SettingsRow
                        label="Currency"
                        detail={CURRENCY_PICKER_OPTIONS.find((option) => option.value === settings.currency)?.label ?? settings.currency}
                        onClick={() => setActiveModal("currency")}
                    />
                    <InsetDivider className="sm:ml-5" />
                    <SettingsRow
                        label="Date Format"
                        detail={settings.dateFormat}
                        onClick={() => setActiveModal("dateFormat")}
                    />
                    <InsetDivider className="sm:ml-5" />
                    <SettingsRow
                        label="Appearance"
                        trailing={<AppearanceToggle darkMode={settings.darkMode} onChange={updateDarkMode} />}
                    />
                </SettingsSection>

                <SettingsSection title="Data">
                    <SettingsRow
                        label="Export Your Data"
                        description="Download all your budget data as CSV"
                        trailing={<Download className="h-[18px] w-[18px] flex-none text-green-600" strokeWidth={2} />}
                    />
                </SettingsSection>

                <div className="mt-2 flex flex-col gap-4">
                    <SettingsSection>
                        <button
                            type="button"
                            onClick={() => setActiveModal("logout")}
                            className="min-h-12 w-full px-4 py-3.5 text-center text-base font-medium text-red-500 transition-colors hover:bg-red-50 active:bg-red-100 dark:hover:bg-red-500/10 dark:active:bg-red-500/20 sm:text-[15px]"
                        >
                            Log Out
                        </button>
                    </SettingsSection>
                    <button
                        type="button"
                        onClick={() => setActiveModal("delete")}
                        className="self-center p-1 text-[13px] text-muted-foreground transition-colors hover:text-red-500"
                    >
                        Delete your account and all data…
                    </button>
                </div>
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

            <PickerModal
                isOpen={activeModal === "currency"}
                onClose={closeModal}
                title="Currency"
                options={CURRENCY_PICKER_OPTIONS}
                selected={settings.currency}
                onSelect={updateCurrency}
            />

            <PickerModal
                isOpen={activeModal === "dateFormat"}
                onClose={closeModal}
                title="Date Format"
                options={DATE_FORMAT_OPTIONS}
                selected={settings.dateFormat}
                onSelect={updateDateFormat}
            />

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
