"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, MailCheck } from "lucide-react"
import { Logo } from "@/components/logo"
import toast from "react-hot-toast"

// Maps the `?error=` codes the confirm route sends back here when a recovery
// link is invalid or expired, so the user can request a fresh one.
const RESET_ERROR_MESSAGES: Record<string, string> = {
    invalid_link: "That password reset link is invalid or has expired. Request a new one below.",
    expired: "That password reset link has expired. Request a new one below.",
    try_again: "We couldn't start your password reset. Please request a new link below.",
}

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    // We never reveal whether the email exists, so success is purely a UI state
    // ("we sent it if the account exists"), not a confirmation of delivery.
    const [submitted, setSubmitted] = useState(false)

    const supabase = createClient()

    // Surface confirm-route failures (redirected here as ?error=...) as a toast,
    // then strip the param so a refresh doesn't re-trigger it.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const errorCode = params.get("error")
        if (!errorCode) return

        toast.error(RESET_ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again.")

        params.delete("error")
        const query = params.toString()
        window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}`
        )
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = email.trim()
        if (!trimmed) return

        setIsLoading(true)
        try {
            // The recovery email must route through /auth/confirm so the token is
            // verified server-side (cross-device safe) and the recovery marker
            // cookie is set before the user reaches /auth/reset-password.
            //
            // ⚠️ Supabase config required: the "Reset Password" email template must
            // point at the confirm route, e.g.
            //   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
            // and this redirect URL must be in the project's allowlist. (The
            // existing email-change flow already uses this token_hash pattern.)
            await supabase.auth.resetPasswordForEmail(trimmed, {
                redirectTo: `${window.location.origin}/auth/confirm`,
            })
            // Always show the same neutral confirmation regardless of whether the
            // email exists — avoids leaking which addresses have accounts.
            setSubmitted(true)
        } catch {
            // Even on an unexpected client error we show the neutral state to
            // preserve the no-enumeration guarantee.
            setSubmitted(true)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-svh flex flex-col bg-gradient-to-b from-background to-muted">
            <header className="pt-6 pb-4 px-4 text-center sm:pt-12">
                <div className="inline-flex items-center justify-center mb-4">
                    <Logo size="lg" animated={false} />
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                        Budget Planner
                    </h1>
                </div>
            </header>

            <div className="flex-1 flex items-start sm:items-center justify-center px-4 pb-8 sm:pb-12">
                <div className="w-full max-w-sm sm:max-w-md">
                    <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-5 pt-6 pb-2 sm:px-8 sm:pt-8 sm:pb-4 text-center">
                            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                                {submitted ? "Check your email" : "Reset your password"}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {submitted
                                    ? "If an account exists for that address, we've sent a link to reset your password."
                                    : "Enter your email and we'll send you a link to reset your password."}
                            </p>
                        </div>

                        <div className="px-5 py-4 sm:px-8 sm:py-6">
                            {submitted ? (
                                <div className="flex flex-col items-center text-center gap-4 py-2">
                                    <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                                        <MailCheck className="w-7 h-7 text-green-600" aria-hidden="true" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Didn&apos;t get an email? Check your spam folder, or{" "}
                                        <button
                                            type="button"
                                            onClick={() => setSubmitted(false)}
                                            className="text-primary hover:text-primary-hover font-medium"
                                        >
                                            try a different address
                                        </button>
                                        .
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="email"
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Email address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={isLoading}
                                            autoComplete="email"
                                            className="h-12 text-base"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full touch-manipulation"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            "Send reset link"
                                        )}
                                    </Button>
                                </form>
                            )}
                        </div>

                        <div className="px-5 py-4 sm:px-8 sm:py-5 bg-muted text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover font-semibold transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
