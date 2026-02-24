"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"

type AuthMode = "login" | "signup"

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
    const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<AuthMode>("login")

    const supabase = createClient()
    const isFormDisabled = isLoading || isGoogleLoading

    const validateSignupForm = (): string | null => {
        if (firstName.trim().length < 1) {
            return "Please enter your first name"
        }
        if (lastName.trim().length < 1) {
            return "Please enter your last name"
        }
        if (password !== confirmPassword) {
            return "Passwords do not match"
        }
        if (password.length < 8) {
            return "Password must be at least 8 characters"
        }
        if (!acceptedTerms) {
            return "Please accept the Terms of Service and Privacy Policy"
        }
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        // Validate signup form
        if (mode === "signup") {
            const validationError = validateSignupForm()
            if (validationError) {
                setError(validationError)
                setIsLoading(false)
                return
            }
        }

        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) {
                    setError(error.message)
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
                    setError(error.message)
                } else {
                    setError("Check your email for the confirmation link!")
                }
            }
        } catch {
            setError("An unexpected error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) {
                setError("Failed to connect to Google. Please try again.");
            }
        } catch {
            setError("Failed to connect to Google. Please try again.");
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
        setError(null)
    }

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode)
        resetForm()
    }

    return (
        <main className="min-h-svh flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Header */}
            <header className="pt-6 pb-4 px-4 text-center sm:pt-12">
                <div className="inline-flex items-center justify-center mb-4">
                    <Logo size="lg" animated={false} />
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Budget Planner
                    </h1>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex items-start sm:items-center justify-center px-4 pb-8 sm:pb-12">
                <div className="w-full max-w-sm sm:max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Card header */}
                        <div className="px-5 pt-6 pb-2 sm:px-8 sm:pt-8 sm:pb-4 text-center">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                                {mode === "login" ? "Welcome back" : "Create account"}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
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
                                className="w-full h-12 text-base font-medium border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
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
                                    <div className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-3 bg-white text-xs sm:text-sm text-gray-500">
                                        or continue with email
                                    </span>
                                </div>
                            </div>

                            {/* Email form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name fields - signup only */}
                                {mode === "signup" && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label 
                                                htmlFor="firstName" 
                                                className="text-sm font-medium text-gray-700"
                                            >
                                                First name
                                            </Label>
                                            <Input
                                                id="firstName"
                                                type="text"
                                                placeholder="John"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                required
                                                disabled={isFormDisabled}
                                                autoComplete="given-name"
                                                className="h-12 text-base"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label 
                                                htmlFor="lastName" 
                                                className="text-sm font-medium text-gray-700"
                                            >
                                                Last name
                                            </Label>
                                            <Input
                                                id="lastName"
                                                type="text"
                                                placeholder="Doe"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                required
                                                disabled={isFormDisabled}
                                                autoComplete="family-name"
                                                className="h-12 text-base"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label 
                                        htmlFor="email" 
                                        className="text-sm font-medium text-gray-700"
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
                                        disabled={isFormDisabled}
                                        autoComplete="email"
                                        className="h-12 text-base"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label 
                                            htmlFor="password" 
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Password
                                        </Label>
                                        {mode === "login" && (
                                            <button
                                                type="button"
                                                className="text-xs sm:text-sm text-green-600 hover:text-green-700 font-medium transition-colors touch-manipulation"
                                                onClick={() => {
                                                    // TODO: Implement forgot password
                                                }}
                                            >
                                                Forgot password?
                                            </button>
                                        )}
                                    </div>
                                    <Input
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
                                    />
                                    {mode === "signup" && (
                                        <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                                    )}
                                </div>

                                {/* Confirm password - signup only */}
                                {mode === "signup" && (
                                    <div className="space-y-1.5">
                                        <Label 
                                            htmlFor="confirmPassword" 
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            Confirm password
                                        </Label>
                                        <Input
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
                                        />
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
                                            className="text-sm text-gray-600 leading-snug cursor-pointer"
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

                                {/* Error/Success message */}
                                {error && (
                                    <div 
                                        role="alert"
                                        className={`p-4 rounded-xl text-sm font-medium ${
                                            error.includes("Check your email") 
                                                ? "bg-green-50 text-green-700 border border-green-200" 
                                                : "bg-red-50 text-red-700 border border-red-200"
                                        }`}
                                    >
                                        {error}
                                    </div>
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
                        <div className="px-5 py-4 sm:px-8 sm:py-5 bg-gray-50 text-center">
                            <p className="text-sm text-gray-600">
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
                        <p className="mt-6 text-center text-xs text-gray-500 px-4">
                            By continuing, you agree to our{" "}
                            <a href="/terms" className="underline hover:text-gray-700">
                                Terms of Service
                            </a>{" "}
                            and{" "}
                            <a href="/privacy" className="underline hover:text-gray-700">
                                Privacy Policy
                            </a>
                        </p>
                    )}
                </div>
            </div>
        </main>
    )
}