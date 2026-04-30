'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'Tasks', href: '/tasks' },
  { label: 'Agents', href: '/agents' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="fixed top-0 w-full z-50 h-[52px] border-b border-gray-200 bg-[#FDFCFC]"
      >
        <div className="w-full max-w-[1400px] h-full mx-auto border-x border-gray-200 flex items-center justify-between pl-6 sm:pl-10 pr-4 sm:pr-8 relative">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <img src="/strawlonglogo.png" alt="Straw Logo" className="h-4 w-auto" />
            </Link>
          </div>

          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center space-x-8 text-[14px] font-medium text-gray-600">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-black transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-5">
            <Link
              href="/waitlist"
              className="text-[14px] font-medium text-black px-5 py-1.5 rounded-[var(--radius)] transition-colors"
              style={{ backgroundColor: "#f7d4d0", border: "1px solid #111" }}
            >
              Join the Waitlist
            </Link>
            {/* Mobile Menu Icon */}
            <button
              className="lg:hidden w-10 h-10 flex items-center justify-center text-black"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          {/* Menu Panel */}
          <div className="absolute top-[52px] left-0 right-0 bg-[#FDFCFC] border-b border-gray-200 shadow-lg">
            <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 px-6 py-6 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-3 text-[16px] font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-[var(--radius)] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-gray-200 mt-4 pt-4">
                <Link
                  href="/waitlist"
                  className="block text-center px-6 py-3 rounded-[var(--radius)] text-[15px] font-medium transition-colors"
                  style={{ backgroundColor: "#f7d4d0", color: "#111", border: "1px solid #111" }}
                  onClick={() => setMenuOpen(false)}
                >
                  Join the Waitlist
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
