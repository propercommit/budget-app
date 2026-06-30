import Link from "next/link"
import { cookies } from "next/headers"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/logo"
import { RECOVERY_COOKIE, verifyRecoveryToken } from "@/lib/recovery"
import { ResetPasswordForm } from "./reset-form"

// Server-rendered gate: only a session that arrived through a recovery link
// carries the signed pw_recovery token (set by /auth/confirm). An ordinary
// authenticated session does NOT, so it never sees the form. This is just the
// display gate — the actual password write re-verifies the token AND binds it
// to the live session user in /api/auth/reset-password.
export default async function ResetPasswordPage() {
    const cookieStore = await cookies()
    const hasRecoveryContext = verifyRecoveryToken(cookieStore.get(RECOVERY_COOKIE)?.value)

    return (
        <main className="min-h-svh flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
            <header className="pt-6 pb-4 px-4 text-center sm:pt-12">
                <div className="inline-flex items-center justify-center mb-4">
                    <Logo size="lg" animated={false} />
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Budget Planner
                    </h1>
                </div>
            </header>

            <div className="flex-1 flex items-start sm:items-center justify-center px-4 pb-8 sm:pb-12">
                <div className="w-full max-w-sm sm:max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-5 pt-6 pb-2 sm:px-8 sm:pt-8 sm:pb-4 text-center">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                                Set a new password
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {hasRecoveryContext
                                    ? "Choose a strong password you don't use elsewhere."
                                    : "This reset link is invalid or has expired."}
                            </p>
                        </div>

                        <div className="px-5 py-4 sm:px-8 sm:py-6">
                            {hasRecoveryContext ? (
                                <ResetPasswordForm />
                            ) : (
                                <div className="text-center py-2">
                                    <Link
                                        href="/auth/forgot-password"
                                        className="inline-flex items-center justify-center w-full h-12 text-base font-medium bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-md transition-colors"
                                    >
                                        Request a new link
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-4 sm:px-8 sm:py-5 bg-gray-50 text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-semibold transition-colors"
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
