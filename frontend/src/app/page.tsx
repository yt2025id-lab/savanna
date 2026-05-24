"use client";

import { LandingNav } from "@/components/landing/Nav";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
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
        <AboutSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <LandingFooter />
      </main>
    </SmoothScroll>
  );
}
