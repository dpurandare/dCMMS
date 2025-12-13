import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TutorialProvider } from "@/components/common/TutorialProvider";

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
        <TutorialProvider>
          {children}
        </TutorialProvider>
      </body>
    </html>
  );
}
