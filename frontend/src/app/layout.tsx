import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0D1A0F",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Savanna Finance — Yield That Grows Naturally",
  description:
    "AI-powered yield protocol on Celo. Deposit from any chain via LI.FI, earn passively with smart rebalancing.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Savanna Finance — Yield That Grows Naturally",
    description:
      "AI-powered yield protocol on Celo. Deposit from any chain via LI.FI, earn passively with smart rebalancing.",
    siteName: "Savanna Finance",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Savanna Finance — Yield That Grows Naturally",
    description:
      "AI-powered yield protocol on Celo. Deposit from any chain via LI.FI, earn passively with smart rebalancing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
