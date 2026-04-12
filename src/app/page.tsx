import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import ProcessFlow from '@/components/home/ProcessFlow';
import Differentiators from '@/components/home/Differentiators';
import FooterSection from '@/components/home/FooterSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFCFC]">
      <Navbar />
      <HeroSection />
      <ProcessFlow />
      <Differentiators />
      <FooterSection />
    </main>
  );
}
