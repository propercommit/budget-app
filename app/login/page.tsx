"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldMessage, fieldInputStyle, focusFirstInvalid } from "@/components/ui/field-message"
import { FormBanner, FormBannerVariant } from "@/components/ui/form-banner"
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"
import toast from "react-hot-toast"

type AuthMode = "login" | "signup"

/**
 * Server-driven form-level feedback (credential errors, signup confirmation).
 * Single-field problems never land here — they render as FieldMessages.
 */
interface Banner {
    variant: FormBannerVariant
    message: string
}

// Maps the `?error=` codes produced by /auth/callback to user-facing messages.
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    auth_failed: "We couldn't complete your sign-in. Please try again.",
    no_code: "Sign-in was interrupted. Please try again.",
    access_denied: "Sign-in was cancelled.",
}

function oauthErrorMessage(code: string): string {
    return OAUTH_ERROR_MESSAGES[code] ?? "Sign-in failed. Please try again."
}

export default function LoginPage() {
    // Form state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    
    // UI state
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [banner, setBanner] = useState<Banner | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const [mode, setMode] = useState<AuthMode>("login")

    const firstNameRef = useRef<HTMLInputElement>(null)
    const lastNameRef = useRef<HTMLInputElement>(null)
    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const confirmPasswordRef = useRef<HTMLInputElement>(null)

    const supabase = createClient()
    const isFormDisabled = isLoading || isGoogleLoading

    // Validate on submit, clear on input: field errors surface only after a
    // failed submit and are derived from live values, so fixing a field
    // clears its message immediately.
    const firstNameInvalid = mode === "signup" && firstName.trim() === ""
    const lastNameInvalid = mode === "signup" && lastName.trim() === ""
    const emailInvalid = email.trim() === ""
    const passwordInvalid = mode === "login" ? password === "" : password.length < 8
    const confirmPasswordInvalid = mode === "signup" && password !== confirmPassword
    const termsInvalid = mode === "signup" && acceptedTerms === false

    const firstNameError = submitted && firstNameInvalid ? "Enter your first name" : null
    const lastNameError = submitted && lastNameInvalid ? "Enter your last name" : null
    const emailError = submitted && emailInvalid ? "Enter your email" : null
    const passwordError = submitted && passwordInvalid
        ? (mode === "login" ? "Enter your password" : "Use at least 8 characters")
        : null
    const confirmPasswordError = submitted && confirmPasswordInvalid ? "Passwords don't match" : null
    const termsError = submitted && termsInvalid

    // Surface OAuth callback failures (redirected here as ?error=...) as a toast,
    // then strip the param so a refresh doesn't re-trigger it.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const errorCode = params.get("error")
        const resetStatus = params.get("reset")
        if (!errorCode && !resetStatus) return

        if (errorCode) {
            toast.error(oauthErrorMessage(errorCode))
        }
        if (resetStatus === "success") {
            toast.success("Password updated. Please sign in with your new password.")
        }

        params.delete("error")
        params.delete("reset")
        const query = params.toString()
        window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}`
        )
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setBanner(null)

        // The submit button is never disabled for validation — this reveals
        // the field messages (and terms banner) and focuses the first miss.
        if (firstNameInvalid || lastNameInvalid || emailInvalid || passwordInvalid || confirmPasswordInvalid || termsInvalid) {
            setSubmitted(true)
            focusFirstInvalid([
                { error: firstNameInvalid, ref: firstNameRef },
                { error: lastNameInvalid, ref: lastNameRef },
                { error: emailInvalid, ref: emailRef },
                { error: passwordInvalid, ref: passwordRef },
                { error: confirmPasswordInvalid, ref: confirmPasswordRef },
            ])
            return
        }

        setIsLoading(true)

        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) {
                    // Never surface the raw Supabase message for credentials.
                    setBanner({ variant: "error", message: "Incorrect email or password. Check both and try again." })
                } else {
                    window.location.href = "/"
                }
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: firstName.trim(),
                            last_name: lastName.trim(),
                        },
                    },
                })
                if (error) {
                    setBanner({ variant: "error", message: error.message })
                } else {
                    setBanner({ variant: "success", message: "Account created. Check your email for the confirmation link." })
                }
            }
        } catch {
            setBanner({ variant: "error", message: "An unexpected error occurred. Please try again." })
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setBanner(null);
        try {
            // Preserve the original destination (set by proxy.ts as ?redirect=)
            // so Google users land where they were headed, like password users do.
            const redirect = new URLSearchParams(window.location.search).get("redirect")
            const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
            if (redirect) callbackUrl.searchParams.set("next", redirect)

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: callbackUrl.toString(),
                },
            });
            if (error) {
                toast.error("Failed to connect to Google. Please try again.")
            }
        } catch {
            toast.error("Failed to connect to Google. Please try again.")
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const resetForm = () => {
        setEmail("")
        setPassword("")
        setFirstName("")
        setLastName("")
        setConfirmPassword("")
        setAcceptedTerms(false)
        setBanner(null)
        setSubmitted(false)
    }

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode)
        resetForm()
    }

    return (
        <main className="min-h-svh flex flex-col bg-gradient-to-b from-background to-muted">
            {/* Header */}
            <header className="pt-6 pb-4 px-4 text-center sm:pt-12">
                <div className="inline-flex items-center justify-center mb-4">
                    <Logo size="lg" animated={false} />
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                        Budget Planner
                    </h1>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex items-start sm:items-center justify-center px-4 pb-8 sm:pb-12">
                <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
                    <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
                        {/* Card header */}
                        <div className="px-5 pt-6 pb-2 sm:px-8 sm:pt-8 sm:pb-4 text-center">
                            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                                {mode === "login" ? "Welcome back" : "Create account"}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {mode === "login" 
                                    ? "Sign in to continue to your account" 
                                    : "Get started with your free account"
                                }
                            </p>
                        </div>

                        {/* Card body */}
                        <div className="px-5 py-4 sm:px-8 sm:py-6">
                            {/* Google button */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-12 text-base font-medium border-border hover:bg-muted active:bg-input transition-colors touch-manipulation"
                                onClick={handleGoogleSignIn}
                                disabled={isFormDisabled}
                            >
                                {isGoogleLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <svg 
                                            className="w-5 h-5 mr-3" 
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        Continue with Google
                                    </>
                                )}
                            </Button>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-3 bg-card text-xs sm:text-sm text-muted-foreground">
                                        or continue with email
                                    </span>
                                </div>
                            </div>

                            {/* Email form */}
                            {/* noValidate: the submit handler owns validation
                                so misses render as FieldMessages, not native
                                browser bubbles. */}
                            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                                {/* Name fields - signup only */}
                                {mode === "signup" && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label 
                                                htmlFor="firstName" 
                                                className="text-sm font-medium text-foreground"
                                            >
                                                First name
                                            </Label>
                                            <Input
                                                ref={firstNameRef}
                                                id="firstName"
                                                type="text"
                                                placeholder="John"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                required
                                                disabled={isFormDisabled}
                                                autoComplete="given-name"
                                                className="h-12 text-base"
                                                style={firstNameError !== null ? fieldInputStyle(true) : undefined}
                                                aria-invalid={firstNameError !== null ? true : undefined}
                                                aria-describedby={firstNameError !== null ? "firstName-error" : undefined}
                                            />
                                            {firstNameError !== null && <FieldMessage id="firstName-error">{firstNameError}</FieldMessage>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label 
                                                htmlFor="lastName" 
                                                className="text-sm font-medium text-foreground"
                                            >
                                                Last name
                                            </Label>
                                            <Input
                                                ref={lastNameRef}
                                                id="lastName"
                                                type="text"
                                                placeholder="Doe"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                required
                                                disabled={isFormDisabled}
                                                autoComplete="family-name"
                                                className="h-12 text-base"
                                                style={lastNameError !== null ? fieldInputStyle(true) : undefined}
                                                aria-invalid={lastNameError !== null ? true : undefined}
                                                aria-describedby={lastNameError !== null ? "lastName-error" : undefined}
                                            />
                                            {lastNameError !== null && <FieldMessage id="lastName-error">{lastNameError}</FieldMessage>}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label 
                                        htmlFor="email" 
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Email address
                                    </Label>
                                    <Input
                                        ref={emailRef}
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isFormDisabled}
                                        autoComplete="email"
                                        className="h-12 text-base"
                                        style={emailError !== null ? fieldInputStyle(true) : undefined}
                                        aria-invalid={emailError !== null ? true : undefined}
                                        aria-describedby={emailError !== null ? "email-error" : undefined}
                                    />
                                    {emailError !== null && <FieldMessage id="email-error">{emailError}</FieldMessage>}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label 
                                            htmlFor="password" 
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Password
                                        </Label>
                                        {mode === "login" && (
                                            <Link
                                                href="/auth/forgot-password"
                                                className="text-xs sm:text-sm text-green-600 hover:text-green-700 font-medium transition-colors touch-manipulation"
                                            >
                                                Forgot password?
                                            </Link>
                                        )}
                                    </div>
                                    <Input
                                        ref={passwordRef}
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isFormDisabled}
                                        minLength={8}
                                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                                        className="h-12 text-base"
                                        style={passwordError !== null ? fieldInputStyle(true) : undefined}
                                        aria-invalid={passwordError !== null ? true : undefined}
                                        aria-describedby={passwordError !== null ? "password-error" : undefined}
                                    />
                                    {passwordError !== null
                                        ? <FieldMessage id="password-error">{passwordError}</FieldMessage>
                                        : mode === "signup" && (
                                            <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                                        )}
                                </div>

                                {/* Confirm password - signup only */}
                                {mode === "signup" && (
                                    <div className="space-y-1.5">
                                        <Label 
                                            htmlFor="confirmPassword" 
                                            className="text-sm font-medium text-foreground"
                                        >
                                            Confirm password
                                        </Label>
                                        <Input
                                            ref={confirmPasswordRef}
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={isFormDisabled}
                                            minLength={8}
                                            autoComplete="new-password"
                                            className="h-12 text-base"
                                            style={confirmPasswordError !== null ? fieldInputStyle(true) : undefined}
                                            aria-invalid={confirmPasswordError !== null ? true : undefined}
                                            aria-describedby={confirmPasswordError !== null ? "confirmPassword-error" : undefined}
                                        />
                                        {confirmPasswordError !== null && <FieldMessage id="confirmPassword-error">{confirmPasswordError}</FieldMessage>}
                                    </div>
                                )}

                                {/* Terms checkbox - signup only */}
                                {mode === "signup" && (
                                    <div className="flex items-start space-x-3 py-2">
                                        <Checkbox
                                            id="terms"
                                            checked={acceptedTerms}
                                            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                                            disabled={isFormDisabled}
                                            className="mt-0.5"
                                        />
                                        <Label 
                                            htmlFor="terms" 
                                            className="text-sm text-muted-foreground leading-snug cursor-pointer"
                                        >
                                            I agree to the{" "}
                                            <a 
                                                href="/terms" 
                                                className="text-green-600 hover:text-green-700 underline"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Terms of Service
                                            </a>{" "}
                                            and{" "}
                                            <a 
                                                href="/privacy" 
                                                className="text-green-600 hover:text-green-700 underline"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Privacy Policy
                                            </a>
                                        </Label>
                                    </div>
                                )}

                                {/* Form-level feedback, directly above the
                                    primary button: whole-form problems and
                                    server results. Terms acceptance is derived
                                    so checking the box clears the banner. */}
                                {termsError && (
                                    <FormBanner variant="error">Please accept the Terms of Service and Privacy Policy</FormBanner>
                                )}
                                {banner !== null && (
                                    <FormBanner variant={banner.variant}>{banner.message}</FormBanner>
                                )}

                                <Button 
                                    type="submit" 
                                    className="w-full h-12 text-base font-medium bg-green-500 hover:bg-green-600 active:bg-green-700 transition-colors touch-manipulation"
                                    disabled={isFormDisabled}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        mode === "login" ? "Sign in" : "Create account"
                                    )}
                                </Button>
                            </form>
                        </div>

                        {/* Card footer */}
                        <div className="px-5 py-4 sm:px-8 sm:py-5 bg-muted text-center">
                            <p className="text-sm text-muted-foreground">
                                {mode === "login" ? (
                                    <>
                                        Don&apos;t have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => switchMode("signup")}
                                            className="text-green-600 hover:text-green-700 font-semibold transition-colors touch-manipulation"
                                        >
                                            Sign up
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => switchMode("login")}
                                            className="text-green-600 hover:text-green-700 font-semibold transition-colors touch-manipulation"
                                        >
                                            Sign in
                                        </button>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Footer text - only show on login */}
                    {mode === "login" && (
                        <p className="mt-6 text-center text-xs text-muted-foreground px-4">
                            By continuing, you agree to our{" "}
                            <a href="/terms" className="underline hover:text-foreground">
                                Terms of Service
                            </a>{" "}
                            and{" "}
                            <a href="/privacy" className="underline hover:text-foreground">
                                Privacy Policy
                            </a>
                        </p>
                    )}
                </div>
            </div>
        </main>
    )
}