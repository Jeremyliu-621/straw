import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import FeatureShowcase from '@/components/home/FeatureShowcase';
import ProcessFlow from '@/components/home/ProcessFlow';
import FooterSection from '@/components/home/FooterSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFCFC]">
      <Navbar />
      <HeroSection />
      <ProcessFlow />
      <FeatureShowcase />
      <FooterSection />
    </main>
  );
}
