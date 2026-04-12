import Link from 'next/link';
import PublicLayout from '@/components/home/PublicLayout';

interface ComingSoonPageProps {
  title: string;
  description: string;
}

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <PublicLayout>
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 p-8 sm:p-12 lg:p-16 xl:p-24 flex flex-col items-center justify-center text-center min-h-[60vh]">
          <div className="w-16 h-16 bg-gray-100 rounded-[--radius] flex items-center justify-center mx-auto mb-8">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-black mb-4">
            {title}
          </h1>
          <p className="text-[#646464] text-[16px] leading-relaxed max-w-[450px] mb-10">
            {description}
          </p>
          <Link
            href="/"
            className="bg-black text-white px-7 py-3 rounded-[--radius] text-[14px] font-medium hover:scale-105 transition-transform"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
