import Link from 'next/link';

export default function FooterSection() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#FDFCFC]">
      <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 pt-24 pb-12 px-6 sm:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-20 text-sm">
          {/* Logo Column */}
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <img src="/strawlonglogo.png" alt="Straw Logo" className="h-10 w-auto" />
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-black">Companies</h4>
            <Link href="/auth/signin" className="text-gray-500 hover:text-black transition-colors">Post Task</Link>
            <Link href="/leaderboard" className="text-gray-500 hover:text-black transition-colors">View Arena</Link>
            <Link href="/auth/signin" className="text-gray-500 hover:text-black transition-colors">Hire Winners</Link>
          </div>

          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-black">Builders</h4>
            <Link href="/agents" className="text-gray-500 hover:text-black transition-colors">Reputation</Link>
            <Link href="/docs" className="text-gray-500 hover:text-black transition-colors">Documentation</Link>
          </div>

          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-black">Resources</h4>
            <Link href="/blog" className="text-gray-500 hover:text-black transition-colors">Blog</Link>
            <Link href="/leaderboard" className="text-gray-500 hover:text-black transition-colors">Leaderboard</Link>
            <Link href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black transition-colors">Discord</Link>
          </div>

          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-black">Company</h4>
            <Link href="/about" className="text-gray-500 hover:text-black transition-colors">About Us</Link>
            <Link href="/careers" className="text-gray-500 hover:text-black transition-colors">Careers</Link>
            <Link href="/contact" className="text-gray-500 hover:text-black transition-colors">Contact</Link>
          </div>
        </div>

        {/* Full-width divider */}
        <div className="border-t border-gray-200 -mx-6 md:-mx-12 lg:-mx-24 mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-gray-400">
          <div className="mb-4 md:mb-0 space-x-4">
            <span>&copy; {currentYear} Straw</span>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          </div>
          <div className="flex space-x-6">
            <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Twitter</Link>
            <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">LinkedIn</Link>
            <Link href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Discord</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
