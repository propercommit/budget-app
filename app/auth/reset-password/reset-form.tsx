"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export function ResetPasswordForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const validate = (): string | null => {
        if (password.length < 8) {
            return "Password must be at least 8 characters"
        }
        if (password !== confirmPassword) {
            return "Passwords do not match"
        }
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
                // Don't silently follow a redirect: if the recovery session
                // expired mid-flow, proxy.ts 302s this POST to /login, which
                // `fetch` would otherwise turn into a 200 and report as success.
                redirect: "manual",
            })

            // An opaque redirect (status 0) means the session lapsed and the
            // request never reached the API — treat as an expired context.
            if (res.type === "opaqueredirect" || res.status === 0) {
                window.location.assign("/auth/forgot-password?error=expired")
                return
            }

            if (res.status === 403) {
                // The recovery context expired or is missing — send them to
                // request a new link rather than showing a generic error.
                window.location.assign("/auth/forgot-password?error=expired")
                return
            }

            const data = await res.json().catch(() => null)

            if (res.ok && data?.success) {
                // The server changed the password and invalidated the recovery
                // session; sign in fresh with the new password.
                window.location.assign("/login?reset=success")
                return
            }

            setError(data?.error ?? "Failed to update password. Please try again.")
            setIsSaving(false)
        } catch {
            setError("Failed to update password. Please try again.")
            setIsSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    New password
                </Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSaving}
                    minLength={8}
                    autoComplete="new-password"
                    className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm new password
                </Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSaving}
                    minLength={8}
                    autoComplete="new-password"
                    className="h-12 text-base"
                />
            </div>

            {error && (
                <div
                    role="alert"
                    className="p-4 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200"
                >
                    {error}
                </div>
            )}

            <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-green-500 hover:bg-green-600 active:bg-green-700 transition-colors touch-manipulation"
                disabled={isSaving}
            >
                {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    "Update password"
                )}
            </Button>
        </form>
    )
}
