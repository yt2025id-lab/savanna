import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Earn Yield — Savanna Finance",
  description:
    "Deposit USDC on Celo and earn AI-optimized yield across Aave V3, Moola, Mento Savings, and more. Automated strategy execution via ERC-8004 agents.",
  openGraph: {
    title: "Earn AI-Optimized Yield on Celo",
    description:
      "Savanna Finance deploys your stablecoins to the highest-yielding protocol on Celo — autonomously, via AI agents using x402 micropayments.",
  },
};

export default function EarnLayout({
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
