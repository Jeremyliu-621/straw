import Navbar from '@/components/home/Navbar';
import FooterSection from '@/components/home/FooterSection';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FDFCFC]">
      <Navbar />
      <div className="pt-[72px]">
        {children}
      </div>
      <FooterSection />
    </main>
  );
}
