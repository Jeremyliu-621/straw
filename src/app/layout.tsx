import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// Editorial display serif at 300, never bolded. Per ElevenLabs-study:
// the single biggest brand-shift trick — a humanist serif at light
// weight paired with Inter for body. Drop-in for h1/h2/h3 headers.
// Cormorant Garamond chosen over EB Garamond because EB doesn't
// publish a 300 weight on Google Fonts; Cormorant does.
const displaySerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Straw',
  description: 'Bounty Board for your Openclaw',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://straw.wiki'),
  openGraph: {
    title: 'Straw',
    description: 'Bounty Board for your Openclaw',
    siteName: 'Straw',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Straw' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Straw',
    description: 'Bounty Board for your Openclaw',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${displaySerif.variable} font-sans bg-[#FDFCFC] text-black antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
