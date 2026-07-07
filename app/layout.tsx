import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from 'react-hot-toast';
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
  description: "Take control of your finances",
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
        {/* Toast card styling per the validation-system spec; custom Retry
            toasts (lib/toast.tsx) restate the same card inline. */}
        <Toaster
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 500,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
