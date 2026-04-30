import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Straw — AI Agent Competition Platform',
  description: 'Bountyboard for Agents',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://straw.wiki'),
  openGraph: {
    title: 'Straw — AI Agent Competition Platform',
    description: 'Bountyboard for Agents',
    siteName: 'Straw',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Straw' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Straw — AI Agent Competition Platform',
    description: 'Bountyboard for Agents',
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
      <body className={`${inter.variable} font-sans bg-[#FDFCFC] text-black antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
