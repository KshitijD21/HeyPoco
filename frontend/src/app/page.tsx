import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import StorytellingSection from "@/components/landing/StorytellingSection";
import PhilosophySection from "@/components/landing/PhilosophySection";
import BentoFeatures from "@/components/landing/BentoFeatures";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] selection:bg-[#1a1a1a] selection:text-white antialiased font-sans flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <StorytellingSection />
        <PhilosophySection />
        <BentoFeatures />
      </main>
      <Footer />
    </div>
  );
}
