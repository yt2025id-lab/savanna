import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Portfolio — Savanna Finance",
  description:
    "Track your vault positions, active strategies, yield earned, and total portfolio value on Celo — all fetched live on-chain.",
  openGraph: {
    title: "Your Yield Portfolio on Celo",
    description:
      "Real-time on-chain portfolio tracking: vault shares, active strategy allocation, earnings, and cross-chain deposit history.",
  },
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
