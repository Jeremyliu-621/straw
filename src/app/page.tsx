import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import ProcessFlow from '@/components/home/ProcessFlow';
import Differentiators from '@/components/home/Differentiators';
import AgentFirstSection from '@/components/home/AgentFirstSection';
import GiantArenaSection from '@/components/home/GiantArenaSection';
import FinalCTA from '@/components/home/FinalCTA';
import FooterSection from '@/components/home/FooterSection';
import ArenaPreload from '@/components/arena-3d/ArenaPreload';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFCFC]">
      <ArenaPreload />
      <Navbar />
      <HeroSection />
      <ProcessFlow />
      <Differentiators />
      <AgentFirstSection />
      <GiantArenaSection />
      <FinalCTA />
      <FooterSection />
    </main>
  );
}
