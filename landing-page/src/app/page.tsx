"use client";

import { Nav } from "@/components/Nav";
import { HeroSection } from "@/components/HeroSection";
import { AboutSection } from "@/components/AboutSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { StatsSection } from "@/components/StatsSection";
import { Footer } from "@/components/Footer";
import { RoundedCorners } from "@/components/RoundedCorners";
import { CustomCursor } from "@/components/CustomCursor";

export default function Home() {
  return (
    <>
      <CustomCursor />
      <main>
        <RoundedCorners />
        <Nav />
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <Footer />
      </main>
    </>
  );
}
