import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/components/Providers";
import { ToastProvider } from "@/components/Toast";
import { config } from "@/config/wagmi";
import { cookieToInitialState } from "wagmi";
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
  title: "Savanna Finance — AI Agents That Pay, Yield That Grows",
  description:
    "AI-powered yield protocol on Celo with x402 micropayments. Autonomous agents pay for strategy analysis, MiniPay zero-click deposits, cross-chain via LI.FI.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Savanna Finance — AI Agents That Pay, Yield That Grows",
    description:
      "AI-powered yield protocol on Celo with x402 micropayments. Autonomous agents pay for strategy analysis, MiniPay zero-click deposits, cross-chain via LI.FI.",
    siteName: "Savanna Finance",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Savanna Finance — AI Agents That Pay, Yield That Grows",
    description:
      "AI-powered yield protocol on Celo with x402 micropayments. Autonomous agents pay for strategy analysis, MiniPay zero-click deposits, cross-chain via LI.FI.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookie = headersList.get("cookie");
  const initialState = cookieToInitialState(config, cookie);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers initialState={initialState}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
