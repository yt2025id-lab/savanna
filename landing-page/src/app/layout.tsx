import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0D1A0F",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Savanna Finance — Yield That Grows Naturally",
  description:
    "AI-powered yield protocol on Celo. Deposit from any chain via LI.FI, earn passively with smart rebalancing.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://savanna.finance"
  ),
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Savanna Finance — Yield That Grows Naturally",
    description:
      "AI-powered yield protocol on Celo. Deposit from any chain via LI.FI, earn passively with smart rebalancing.",
    siteName: "Savanna Finance",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Savanna Finance — Yield That Grows Naturally",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Savanna Finance — Yield That Grows Naturally",
    description:
      "AI-powered yield protocol on Celo. Deposit from any chain via LI.FI, earn passively with smart rebalancing.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
