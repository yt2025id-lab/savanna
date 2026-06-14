import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Testnet Faucet — Savanna Finance",
  description:
    "Get test USDC, cbBTC, and cETH on Celo Sepolia to try Savanna Finance's AI-powered yield optimization.",
};

export default function FaucetLayout({
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
