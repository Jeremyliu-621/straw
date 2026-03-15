import Link from 'next/link';

export default function FooterSection() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white pt-24 pb-12 px-6 md:px-12 lg:px-24 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-20 text-sm">
          {/* Logo Column */}
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-600 flex justify-center items-center text-white text-xs font-bold">E</div>
              <span className="font-bold text-lg tracking-tight">ElevenLabs</span>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-black">ElevenCreative</h4>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Text to Speech</Link>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Voice Cloning</Link>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Dubbing</Link>
          </div>

          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-black">ElevenAgents</h4>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Overview</Link>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Use Cases</Link>
          </div>

          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-black">Resources</h4>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Blog</Link>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Help Center</Link>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">API Docs</Link>
          </div>

          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-black">Company</h4>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">About Us</Link>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Careers</Link>
            <Link href="#" className="text-gray-500 hover:text-black transition-colors">Contact</Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-100 text-xs text-gray-400">
          <div className="mb-4 md:mb-0 space-x-4">
            <span>© {currentYear} ElevenLabs</span>
            <Link href="#" className="hover:text-black transition-colors">Terms</Link>
            <Link href="#" className="hover:text-black transition-colors">Privacy</Link>
          </div>
          <div className="flex space-x-6">
            <Link href="#" className="hover:text-black transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-black transition-colors">LinkedIn</Link>
            <Link href="#" className="hover:text-black transition-colors">Discord</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
