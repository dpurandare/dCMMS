import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TutorialProvider } from "@/components/common/TutorialProvider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

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
