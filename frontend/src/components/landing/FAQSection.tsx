"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { AnimatedTitle } from "./AnimatedTitle";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does the AI agent choose the best strategy?",
    a: "Savanna's AI agent queries real-time APY from Aave V3, Moola, Mento Savings, and Reserve on Celo Mainnet. It compares yield rates, risk scores, and TVL stability — then deploys your funds to the protocol with the optimal risk-adjusted return. You can also use the AI Strategy page to customize risk tolerance and time horizon.",
  },
  {
    q: "Is my deposit safe?",
    a: "Yes. Savanna uses a non-custodial ERC-4626 vault — you always hold the keys. Funds are deployed through audited strategy adapters using OpenZeppelin's industry-standard contracts with ReentrancyGuard, Pausable, and SafeERC20. Every strategy decision is tied to an ERC-8004 agent identity for on-chain accountability.",
  },
  {
    q: "What is x402 and why do I need to pay?",
    a: "x402 is a micropayment protocol that enables HTTP 402 Payment Required for AI services. You pay 0.10 USDC per strategy analysis — a tiny fee that covers the AI agent's on-chain transaction costs. The agent literally pays for itself by finding better yields than you'd get from a single protocol.",
  },
  {
    q: "Can I withdraw anytime?",
    a: "Absolutely. There are no lock-up periods. If your funds are deployed to a lending protocol, withdrawing takes two transactions: one to pull from the protocol back to the vault, and one to release your ERC-4626 shares. Both complete in under 5 seconds on Celo's 1-second finality.",
  },
  {
    q: "What chains can I deposit from?",
    a: "Ethereum, Arbitrum, Optimism, Polygon, Base, BSC, and Avalanche — all via LI.FI bridge. Your tokens are automatically bridged and swapped to the vault asset (cUSD on Celo Mainnet) in one transaction.",
  },
  {
    q: "What is ERC-8004 Agent Trust?",
    a: "ERC-8004 is an on-chain agent identity and reputation standard. Savanna's AI agent is registered as Agent #9210 on Celo Mainnet. Every strategy execution is tracked on-chain, building verifiable reputation over time. You can view the agent's activity at 8004scan.io/agent/9210.",
  },
];

function FAQItem({ q, a, isOpen, toggle }: { q: string; a: string; isOpen: boolean; toggle: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!contentRef.current) return;
    if (isOpen) {
      gsap.to(contentRef.current, { height: "auto", opacity: 1, duration: 0.35, ease: "power2.out" });
    } else {
      gsap.to(contentRef.current, { height: 0, opacity: 0, duration: 0.25, ease: "power2.in" });
    }
  }, { dependencies: [isOpen] });

  return (
    <div className="border-b border-border/50 last:border-none">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between py-4 text-left group cursor-pointer"
      >
        <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors pr-4">
          {q}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-accent transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div ref={contentRef} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
        <p className="text-sm text-muted-light leading-relaxed pb-4">{a}</p>
      </div>
    </div>
  );
}

export function FAQSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.from(containerRef.current.querySelectorAll(".faq-item-wrap"), {
      scrollTrigger: { trigger: containerRef.current, start: "top 80%", toggleActions: "play none none none" },
      opacity: 0, y: 30, duration: 0.5, stagger: 0.06, ease: "power2.out",
    });
  }, { scope: containerRef });

  return (
    <section
      className="section"
      id="faq"
      style={{
        background: "#0D1A0F",
        borderTop: "1px solid rgba(200, 168, 75, 0.08)",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div ref={containerRef} className="mx-auto max-w-3xl px-4">
        <div className="section-label">FAQ</div>

        <AnimatedTitle
          title="Got <b>Questions?</b>"
          containerClass="mb-2"
        />

        <p className="section-sub" style={{ marginBottom: "2.5rem" }}>
          Everything you need to know about AI-powered yield on Celo.
        </p>

        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item-wrap">
              <FAQItem
                q={faq.q}
                a={faq.a}
                isOpen={openIdx === i}
                toggle={() => setOpenIdx(openIdx === i ? null : i)}
              />
            </div>
          ))}
        </div>

        <p className="text-center mt-6 text-xs text-muted">
          More questions?{" "}
          <a href="https://github.com/yt2025id-lab/savanna" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Check the docs on GitHub
          </a>
        </p>
      </div>
    </section>
  );
}
