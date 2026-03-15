'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 h-[72px] border-b border-gray-200 ${
        scrolled ? 'bg-[#FDFCFC]/90 backdrop-blur-md shadow-sm' : 'bg-[#FDFCFC]'
      }`}
    >
      <div className="w-full max-w-[1400px] h-full mx-auto border-x border-gray-200 flex items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2">
          {/* Logo Match */}
          <Link href="/" className="flex items-center gap-0.5 tracking-tighter text-black font-semibold text-[22px]">
            <span className="font-light mr-0.5 text-gray-400">||</span> ElevenLabs
          </Link>
        </div>

        <div className="hidden lg:flex items-center space-x-8 text-[14px] font-medium text-gray-600">
          <Link href="#" className="hover:text-black transition-colors">
            Creative Platform
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            Agents Platform
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            Developers
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            Resources
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            Enterprise
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            Pricing
          </Link>
        </div>

        <div className="flex items-center space-x-5">
          <Link href="#" className="text-[14px] font-medium text-gray-700 hover:text-black transition-colors hidden sm:block">
            Log in
          </Link>
          <Link
            href="#"
            className="text-[14px] font-medium bg-black text-white px-5 py-2.5 rounded-full hover:scale-105 transition-transform"
          >
            Sign up
          </Link>
          {/* Mobile Menu Icon */}
          <button className="lg:hidden w-10 h-10 flex items-center justify-center text-black">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
