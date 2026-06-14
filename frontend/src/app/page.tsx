"use client";

import { LandingNav } from "@/components/landing/Nav";
import { HeroSection } from "@/components/landing/HeroSection";
import { LiveStatsBanner } from "@/components/landing/LiveStatsBanner";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { CeloEcosystemSection } from "@/components/landing/CeloEcosystemSection";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { FAQSection } from "@/components/landing/FAQSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { LandingFooter } from "@/components/landing/Footer";
import { RoundedCorners } from "@/components/landing/RoundedCorners";
import { CustomCursor } from "@/components/landing/CustomCursor";
import { SmoothScroll } from "@/components/landing/SmoothScroll";

export default function Home() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <main>
        <RoundedCorners />
        <LandingNav />
        <HeroSection />
        <LiveStatsBanner />
        <AboutSection />
        <FeaturesSection />
        <TrustBadges />
        <HowItWorksSection />
        <CeloEcosystemSection />
        <FAQSection />
        <StatsSection />
        <LandingFooter />
      </main>
    </SmoothScroll>
  );
}
