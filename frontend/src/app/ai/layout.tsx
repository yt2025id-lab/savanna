import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "AI Strategy Analyzer — Savanna Finance",
  description:
    "Let Savanna's AI agent analyze live APYs across Celo lending protocols and recommend the optimal yield strategy for your risk profile.",
  openGraph: {
    title: "AI-Powered Yield Strategy on Celo",
    description:
      "AI agents compare Aave V3, Moola, Mento Savings & Reserve APYs on Celo. Pay once via x402 (0.10 USDC) and get your personalized strategy.",
  },
};

export default function AILayout({
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
