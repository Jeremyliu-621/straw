import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import FeatureShowcase from '@/components/home/FeatureShowcase';
import FooterSection from '@/components/home/FooterSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFCFC]">
      <Navbar />
      <HeroSection />
      <FeatureShowcase />
      <FooterSection />
    </main>
  );
}
