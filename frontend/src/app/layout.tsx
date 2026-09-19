import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TutorialProvider } from "@/components/common/TutorialProvider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

/**
 * Every route renders on demand.
 *
 * Required by the nonce-based CSP in src/middleware.ts (REV-019): a nonce is
 * per-request, so Next can only stamp it onto pages it renders per request.
 * Statically prerendered HTML is baked at build time and its inline scripts
 * carry no nonce, which the policy then blocks.
 *
 * Little is given up: every page here is an authenticated dashboard that
 * fetches its data client-side, so there was no meaningful static content to
 * cache.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "dCMMS - Distributed Computerized Maintenance Management System",
  description: "Multi-tenant CMMS for managing maintenance operations across distributed sites",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ErrorBoundary>
            <TutorialProvider>
              {children}
            </TutorialProvider>
          </ErrorBoundary>
        </ThemeProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
