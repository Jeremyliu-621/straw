import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-6 sm:px-12 lg:px-24 max-w-7xl mx-auto flex flex-col items-center text-center">
      <div className="max-w-4xl space-y-6">
        <h1 className="text-5xl md:text-7xl font-light tracking-tight text-[#000000] leading-tight">
          Bringing technology <br className="hidden md:block" />
          to life
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-normal">
          Powering the best enterprises, creators, and developers. From ElevenAgents for customer experience, ElevenCreative for content creation, to the leading AI voice generator.
        </p>
        
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="#"
            className="text-base font-medium bg-black text-white px-6 py-3 rounded-full hover:scale-105 transition-transform duration-200"
          >
            Sign up
          </Link>
          <Link
            href="#"
            className="text-base font-medium bg-white border border-gray-200 text-black px-6 py-3 rounded-full hover:bg-gray-50 transition-colors duration-200 shadow-sm"
          >
            Contact sales
          </Link>
        </div>
      </div>

      {/* Placeholder for Graphic/UI Element */}
      <div className="mt-20 w-full max-w-5xl aspect-video bg-red-600 rounded-2xl shadow-2xl flex items-center justify-center text-white/50 text-2xl font-light tracking-widest relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-red-700 to-red-500 opacity-50" />
        <span className="relative z-10">[ UI MOCKUP PLACEHOLDER ]</span>
      </div>
    </section>
  );
}
