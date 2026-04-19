import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import ProcessFlow from '@/components/home/ProcessFlow';
import Differentiators from '@/components/home/Differentiators';
import FinalCTA from '@/components/home/FinalCTA';
import FooterSection from '@/components/home/FooterSection';
import LandingR3FHost from '@/components/home/LandingR3FHost';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFCFC]">
      <Navbar />
      <HeroSection />
      <ProcessFlow />
      <Differentiators />
      <FinalCTA />
      <FooterSection />
      {/* Single shared R3F Canvas — all 3D views on the landing tunnel into this. */}
      <LandingR3FHost />
    </main>
  );
}
