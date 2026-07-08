import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * Shared chrome + typography for the public legal pages (/privacy, /terms).
 *
 * The pages themselves contain plain semantic HTML (h1/h2/p/ul/table/blockquote);
 * all styling is applied here via descendant selectors so both documents stay
 * visually consistent without repeating classes on every element.
 */
export default function LegalLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <main className="min-h-screen bg-gray-50">
            <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
                <Link
                    href="/"
                    className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to PlanBudget
                </Link>

                <article
                    className={[
                        "rounded-2xl bg-white px-5 py-8 shadow-sm sm:px-10 sm:py-12",
                        "text-[15px] leading-relaxed text-gray-600",
                        "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-[#1D1D1F] sm:[&_h1]:text-3xl",
                        "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#1D1D1F]",
                        "[&_p]:mt-3",
                        "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
                        "[&_strong]:font-semibold [&_strong]:text-[#1D1D1F]",
                        "[&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4",
                        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary-hover",
                        "[&_hr]:my-10 [&_hr]:border-gray-200",
                        "[&_table]:mt-3 [&_table]:w-full [&_table]:text-left [&_table]:text-sm",
                        "[&_th]:border-b [&_th]:border-gray-200 [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-[#1D1D1F]",
                        "[&_td]:border-b [&_td]:border-gray-100 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top",
                    ].join(" ")}
                >
                    {children}
                </article>

                <footer className="mt-6 text-center text-xs text-gray-500">
                    <Link href="/privacy" className="underline hover:text-gray-700">
                        Privacy Policy
                    </Link>
                    {" · "}
                    <Link href="/terms" className="underline hover:text-gray-700">
                        Terms and Conditions
                    </Link>
                </footer>
            </div>
        </main>
    )
}
