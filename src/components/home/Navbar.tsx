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
      className={`fixed top-0 w-full z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between ${
        scrolled ? 'bg-white/80 backdrop-blur-md border-b border-gray-200' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Placeholder Logo */}
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
          E
        </div>
        <span className="font-bold text-xl tracking-tight">ElevenLabs</span>
      </div>

      <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-500">
        <Link href="#" className="hover:text-black transition-colors duration-200">
          ElevenCreative
        </Link>
        <Link href="#" className="hover:text-black transition-colors duration-200">
          ElevenAgents
        </Link>
        <Link href="#" className="hover:text-black transition-colors duration-200">
          ElevenAPI
        </Link>
        <Link href="#" className="hover:text-black transition-colors duration-200">
          Resources
        </Link>
        <Link href="#" className="hover:text-black transition-colors duration-200">
          Enterprise
        </Link>
        <Link href="#" className="hover:text-black transition-colors duration-200">
          Pricing
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        <Link href="#" className="text-sm font-medium text-gray-700 hover:text-black transition-colors duration-200">
          Log in
        </Link>
        <Link
          href="#"
          className="text-sm font-medium bg-black text-white px-5 py-2 rounded-full hover:scale-105 transition-transform duration-200"
        >
          Sign up
        </Link>
      </div>
    </nav>
  );
}
