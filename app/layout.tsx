import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from 'react-hot-toast';
import { TOAST_CARD_STYLE } from "@/lib/toast";
import { SettingsProvider } from "@/lib/settings-context";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlanBudget",
  description: "Personal budgeting made for Switzerland — plan monthly category budgets, track spending, and import bank statements (MT940).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SettingsProvider>
          {children}
        </SettingsProvider>
        <SpeedInsights />
        {/* Toast card styling per the validation-system spec, shared with the
            custom Retry toast in lib/toast.tsx. */}
        <Toaster toastOptions={{ style: TOAST_CARD_STYLE }} />
        <Analytics />
      </body>
    </html>
  );
}
